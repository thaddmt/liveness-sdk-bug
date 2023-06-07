import {
  ClientSessionInformationEvent,
  LivenessResponseStream,
  RekognitionStreamingClient,
  RekognitionStreamingClientConfig,
  StartFaceLivenessSessionCommand,
} from "@aws-sdk/client-rekognitionstreaming";
import { VideoRecorder } from "./realVideoRecorder";

export interface StartLivenessStreamInput {
  sessionId: string;
}
export interface StartLivenessStreamOutput {
  sessionId: string;
  stream: WebSocket;
}

export interface Credentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
}

const ENDPOINT = process.env.NEXT_PUBLIC_STREAMING_API_URL;

export class LivenessStreamProvider {
  public sessionId: string;
  public region: string;
  public videoRecorder: VideoRecorder;
  public responseStream!: AsyncIterable<LivenessResponseStream>;

  private _reader!: ReadableStreamDefaultReader;
  private videoEl: HTMLVideoElement;
  private _client!: RekognitionStreamingClient;
  private _stream: MediaStream;
  private initPromise: Promise<void>;

  // eslint-disable-next-line max-params
  constructor(
    sessionId: string,
    region: string,
    stream: MediaStream,
    videoEl: HTMLVideoElement
  ) {
    this.sessionId = sessionId;
    this.region = region;
    this._stream = stream;
    this.videoEl = videoEl;
    this.videoRecorder = new VideoRecorder(stream);
    this.initPromise = this.init();
  }

  public async getResponseStream(): Promise<
    AsyncIterable<LivenessResponseStream>
  > {
    await this.initPromise;
    return this.responseStream;
  }

  private async init() {
    const clientconfig: RekognitionStreamingClientConfig = {
      credentials: {
        accessKeyId: "any",
        secretAccessKey: "any",
        sessionToken: "any",
      },
      region: this.region,
    };

    if (ENDPOINT) {
      clientconfig.endpointProvider = () => {
        const url = new URL(ENDPOINT);
        return { url };
      };
    }

    this._client = new RekognitionStreamingClient(clientconfig);

    this.responseStream = await this.startLivenessVideoConnection();
  }

  // Creates a generator from a stream of video chunks and livenessActionDocuments and yields VideoEvent and ClientEvents
  private getAsyncGeneratorFromReadableStream(
    stream: ReadableStream
  ): () => AsyncGenerator<any> {
    const current = this;
    this._reader = stream.getReader();
    return async function* () {
      while (true) {
        const { done, value } = await current._reader.read();
        if (done) {
          return;
        }
      }
    };
  }

  private async startLivenessVideoConnection(): Promise<
    AsyncIterable<LivenessResponseStream>
  > {
    const livenessRequestGenerator = this.getAsyncGeneratorFromReadableStream(
      this.videoRecorder.videoStream
    )();

    console.log("here");
    const response = await this._client.send(
      new StartFaceLivenessSessionCommand({
        ChallengeVersions: "FaceMovementAndLightChallenge_1.0.0",
        SessionId: this.sessionId,
        LivenessRequestStream: livenessRequestGenerator,
        VideoWidth: this.videoEl.videoWidth.toString(),
        VideoHeight: this.videoEl.videoHeight.toString(),
      })
    );
    console.log("response success");
    return response.LivenessResponseStream!;
  }
}

"use client"
import { useEffect, useRef, useState } from 'react';
// import { LivenessStreamProvider } from './modules/StreamProvider';
import { LivenessStreamProvider } from './modules/realStreamProvider';
import { VideoRecorder } from './modules/realVideoRecorder';

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const recorder = useRef<VideoRecorder>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function main() {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      videoRef.current!.srcObject = stream;
      videoRef.current!.oncanplay = async () => {
        (recorder.current as any) = new VideoRecorder(stream);
        recorder.current!.start(200);
        const provider = new LivenessStreamProvider("ee64b973-d0ef-4365-b61e-a3cdf7f1c7b0", 'us-east-1', stream, videoRef.current!);
      };
    }

    main();
  }, []);

  const stopHandler = () => {
    // close() will only pose the data stream but not close ws connection
    // destroy() will close the ws connection.
  };


  return (
    <div>
      <video
        ref={videoRef}
        muted
        autoPlay
        playsInline
        height="480"
        width="640"
        style={{ transform: "scaleX(-1)" }}
      ></video>

      <button onClick={stopHandler}>Stop</button>
    </div>
  );

}

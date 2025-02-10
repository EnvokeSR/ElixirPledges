import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface VideoRecorderProps {
  pledgeText: string;
  onBack: () => void;
  onComplete: () => void;
  userData: any;
}

export default function VideoRecorder({ pledgeText, onBack, onComplete, userData }: VideoRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      videoChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          videoChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const videoBlob = new Blob(videoChunksRef.current, { type: 'video/webm' });
        const videoUrl = URL.createObjectURL(videoBlob);

        // Stop the live stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }

        // Clear the srcObject and set the video source to the recorded video
        if (videoRef.current) {
          videoRef.current.srcObject = null;
          videoRef.current.src = videoUrl;
          videoRef.current.play();
        }
        setRecordedVideo(videoUrl);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to access camera and microphone",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSubmit = async () => {
    if (!recordedVideo) return;

    console.log("Starting video upload with user data:", userData);

    try {
      const videoBlob = await fetch(recordedVideo).then(r => r.blob());
      console.log("Video blob created:", videoBlob);

      const formData = new FormData();
      // Append form fields first before the file
      formData.append('name', userData.name);
      formData.append('grade', userData.grade);
      formData.append('celebrity', userData.favoriteCelebrity);
      formData.append('userId', userData.id.toString());
      // Append video file last
      formData.append('video', videoBlob, `${userData.name}_${userData.grade}_${userData.favoriteCelebrity}.webm`);

      console.log("FormData created with fields:", {
        name: userData.name,
        grade: userData.grade,
        celebrity: userData.favoriteCelebrity,
        userId: userData.id
      });

      const response = await fetch('/api/videos', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload video');
      }

      const result = await response.json();
      console.log("Upload successful:", result);

      onComplete();
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Error",
        description: "Failed to upload video",
        variant: "destructive"
      });
    }
  };

  const resetRecording = () => {
    setRecordedVideo(null);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = "";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4">
          <p className="whitespace-pre-line text-lg leading-relaxed">{pledgeText}</p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={!recordedVideo}
          controls={!!recordedVideo}
          className="w-full aspect-video rounded-lg bg-muted"
        />

        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>

          {!recordedVideo && !isRecording && (
            <Button onClick={startRecording}>
              Start Recording
            </Button>
          )}

          {isRecording && (
            <Button variant="destructive" onClick={stopRecording}>
              Stop Recording
            </Button>
          )}

          {recordedVideo && (
            <>
              <Button variant="outline" onClick={resetRecording}>
                Record Again
              </Button>
              <Button onClick={handleSubmit}>
                Submit Video
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
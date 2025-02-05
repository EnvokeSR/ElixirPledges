import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
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
        setRecordedVideo(videoUrl);

        // Stop the live stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
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

    const videoBlob = await fetch(recordedVideo).then(r => r.blob());
    const formData = new FormData();
    formData.append('video', videoBlob, `${userData.name}_${userData.grade}_${userData.favoriteCelebrity}.webm`);
    formData.append('userId', userData.id.toString());

    try {
      await fetch('/api/videos', {
        method: 'POST',
        body: formData,
      });
      onComplete();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload video",
        variant: "destructive"
      });
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
        {recordedVideo ? (
          <video
            src={recordedVideo}
            controls
            className="w-full aspect-video rounded-lg"
          />
        ) : (
          <video
            ref={videoPreviewRef}
            autoPlay
            playsInline
            muted
            className="w-full aspect-video rounded-lg bg-muted"
          />
        )}

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
              <Button variant="outline" onClick={() => {
                setRecordedVideo(null);
                if (videoPreviewRef.current) {
                  videoPreviewRef.current.srcObject = null;
                }
              }}>
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
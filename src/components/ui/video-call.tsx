import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Video, VideoOff, Mic, MicOff, Phone, PhoneOff, Users, Settings, Share } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VideoCallProps {
  groupId: string;
  participants: Array<{
    id: string;
    name: string;
    isOnline: boolean;
  }>;
}

export const VideoCall = ({ groupId, participants }: VideoCallProps) => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCallActive) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isCallActive]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startCall = async () => {
    try {
      // Request camera and microphone permissions
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideoEnabled,
        audio: isAudioEnabled
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setIsCallActive(true);
      setCallDuration(0);
      
      toast({
        title: "Call Started",
        description: "Local video preview started. Use Google Meet for group calls."
      });

      // Note: This is a local preview. For actual group calls, use the Google Meet button
      
    } catch (error) {
      toast({
        title: "Call Failed",
        description: "Unable to access camera/microphone. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  const endCall = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }

    setIsCallActive(false);
    setCallDuration(0);
    setIsDialogOpen(false);
    
    toast({
      title: "Call Ended",
      description: `Call duration: ${formatDuration(callDuration)}`
    });
  };

  const toggleVideo = () => {
    setIsVideoEnabled(!isVideoEnabled);
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoEnabled;
      }
    }
  };

  const toggleAudio = () => {
    setIsAudioEnabled(!isAudioEnabled);
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isAudioEnabled;
      }
    }
  };

  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center space-x-2">
            <Video className="w-4 h-4" />
            <span>Video Call</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-card/95 backdrop-blur-sm border-primary/10 max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center justify-between">
              <span>Group Video Call</span>
              {isCallActive && (
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                  {formatDuration(callDuration)}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {isCallActive ? "Call in progress" : "Start a video call with your group members"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Video Area */}
            <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
              {isCallActive ? (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white">
                  <div className="text-center">
                    <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">Click "Start Call" to begin</p>
                  </div>
                </div>
              )}

              {/* Video overlay controls */}
              {isCallActive && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                  <Button
                    variant={isVideoEnabled ? "secondary" : "destructive"}
                    size="sm"
                    onClick={toggleVideo}
                  >
                    {isVideoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant={isAudioEnabled ? "secondary" : "destructive"}
                    size="sm"
                    onClick={toggleAudio}
                  >
                    {isAudioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                  </Button>
                  <Button variant="outline" size="sm">
                    <Share className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={endCall}>
                    <PhoneOff className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => window.open('https://meet.google.com', '_blank')}
                  >
                    <Video className="w-4 h-4 mr-1" />
                    Google Meet
                  </Button>
                </div>
              )}
            </div>

            {/* Participants */}
            <Card className="bg-card/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center">
                  <Users className="w-4 h-4 mr-2" />
                  Participants ({participants.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center space-x-2 p-2 bg-secondary/10 rounded-lg"
                    >
                      <div className={`w-2 h-2 rounded-full ${participant.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                      <span className="text-sm text-foreground">{participant.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Call Controls */}
            <div className="flex justify-center space-x-4">
              {!isCallActive ? (
                <Button onClick={startCall} variant="hero" size="lg">
                  <Phone className="w-5 h-5 mr-2" />
                  Start Call
                </Button>
              ) : (
                <Button onClick={endCall} variant="destructive" size="lg">
                  <PhoneOff className="w-5 h-5 mr-2" />
                  End Call
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
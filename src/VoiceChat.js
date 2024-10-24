import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';


const VoiceChat = () => {
  const [micOn, setMicOn] = useState(true);
  const [callActive, setCallActive] = useState(false);
  const socketRef = useRef(null);
  const userStream = useRef(null);
  const mediaRecorder = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    socketRef.current = io.connect('http://localhost:5000');

    socketRef.current.on('audio-data', (base64Data) => {
      playAudioChunk(base64Data);
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  const playAudioChunk = (base64Data) => {
    const binaryString = window.atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);

    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const audioBlob = new Blob([bytes], { type: 'audio/webm; codecs=opus' });
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audio.play();
  };

  const startCall = () => {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      userStream.current = stream;

      mediaRecorder.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          const reader = new FileReader();
          reader.readAsDataURL(event.data);
          reader.onloadend = () => {
            const base64String = reader.result.split(',')[1];
            socketRef.current.emit('audio-data', base64String);
          };
        }
      };

      mediaRecorder.current.start(500);
      setCallActive(true);
    }).catch((err) => console.error('Error accessing microphone:', err));
  };

  const endCall = () => {
    if (mediaRecorder.current) {
      mediaRecorder.current.stop();
    }
    if (userStream.current) {
      userStream.current.getTracks().forEach(track => track.stop());
    }
    setCallActive(false);
  };

  const toggleMic = () => {
    if (userStream.current) {
      const audioTrack = userStream.current.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setMicOn(audioTrack.enabled);
    }
  };

  return (
      <div className="voice-chat-box">
        <h1 className="title">Live Voice Chat</h1>

        <div className="button-container">
          <button className="btn start-btn" onClick={startCall} disabled={callActive}>
            <i className="fas fa-microphone"></i> Start Call
          </button>
          <button className="btn stop-btn" onClick={endCall} disabled={!callActive}>
            <i className="fas fa-stop"></i> End Call
          </button>
        </div>

        {callActive && (
            <div className="mic-toggle-container">
              <button className="btn toggle-btn" onClick={toggleMic}>
                {micOn ? (
                    <>
                      <i className="fas fa-microphone-slash"></i> Mute Mic
                    </>
                ) : (
                    <>
                      <i className="fas fa-microphone"></i> Unmute Mic
                    </>
                )}
              </button>
            </div>
        )}

        {/* <audio ref={audioRef} controls autoPlay className="audio-player" /> */}
      </div>
  );
};

export default VoiceChat;

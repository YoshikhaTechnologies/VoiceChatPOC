import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import SimplePeer from 'simple-peer';

const VoiceChat = () => {
  const [micOn, setMicOn] = useState(true); // Mic state (true = on, false = off)
  const [callActive, setCallActive] = useState(false); // Track if call is active
  const [peer, setPeer] = useState(null);
  const socketRef = useRef(null);
  const userStream = useRef(null);
  const audioRef = useRef(null); // Reference to the audio element

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io.connect('http://localhost:5000');

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  // Request microphone access and start the call
  const startCall = () => {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        console.log('User audio stream:', stream); // Add this log
      userStream.current = stream;

      // Emit "ready" signal to server when user is ready
      socketRef.current.emit('ready');
      setCallActive(true); // Call is now active

      // Listen for signal from another peer
      socketRef.current.on('signal', (data) => {
        const incomingPeer = new SimplePeer({
          initiator: false,
          trickle: false,
          stream: userStream.current,
        });

        incomingPeer.signal(data.signal);

        incomingPeer.on('signal', (signal) => {
          socketRef.current.emit('signal', { signal, to: data.from });
        });

        incomingPeer.on('stream', (peerStream) => {
          if (audioRef.current) {
            audioRef.current.srcObject = peerStream;
            audioRef.current.play();
          }
        });

        setPeer(incomingPeer);
      });

      // Start call if ready
      socketRef.current.on('ready', (userId) => {
        const outgoingPeer = new SimplePeer({
          initiator: true,
          trickle: false,
          stream: userStream.current,
        });

        outgoingPeer.on('signal', (signal) => {
          socketRef.current.emit('signal', { signal, to: userId });
        });

        outgoingPeer.on('stream', (peerStream) => {
          if (audioRef.current) {
            audioRef.current.srcObject = peerStream;
            audioRef.current.play();
          }
        });

        setPeer(outgoingPeer);
      });
    }).catch((err) => {
        console.error('Error accessing media devices:', err);
      });
  };

  // End the call
  const endCall = () => {
    if (userStream.current) {
      userStream.current.getTracks().forEach(track => track.stop()); // Stop all media tracks
    }
    if (peer) {
      peer.destroy(); // Destroy the peer connection
    }
    setCallActive(false); // Reset call state
    setPeer(null);
  };

  // Toggle microphone on/off
  const toggleMic = () => {
    if (userStream.current) {
      const audioTrack = userStream.current.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled; // Toggle the audio track
      setMicOn(audioTrack.enabled); // Update mic state
    }
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h1>Live Voice Chat</h1>

      <div>
        <button onClick={startCall} disabled={callActive}>
          Start Call
        </button>
        <button onClick={endCall} disabled={!callActive}>
          End Call
        </button>
      </div>

      {callActive && (
        <div style={{ marginTop: '20px' }}>
          <button onClick={toggleMic}>
            {micOn ? 'Mute Mic' : 'Unmute Mic'}
          </button>
        </div>
      )}

      <audio ref={audioRef} controls autoPlay style={{ marginTop: '20px' }} />
    </div>
  );
};

export default VoiceChat;
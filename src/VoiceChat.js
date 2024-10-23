import React, { useState, useRef, useEffect } from 'react';
import io from 'socket.io-client';
import Peer from 'simple-peer';

const socket = io.connect('http://localhost:5000'); // Replace with your signaling server address

function VoiceChat() {
  const [myID, setMyID] = useState('');
  const [otherUser, setOtherUser] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const myStreamRef = useRef();
  const peerRef = useRef();

  useEffect(() => {
    // Get user media (microphone access)
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        myStreamRef.current = stream;
        // Assign local stream to an audio element (optional, for local listening)
        const audioElement = document.createElement('audio');
        audioElement.srcObject = stream;
        audioElement.play();
      })
      .catch(err => console.error('Error accessing audio stream:', err));

    // Receive your own ID from the signaling server
    socket.on('connect', () => {
      setMyID(socket.id);
    });

    // When receiving a signal from another user
    socket.on('signal', (data) => {
      const peer = peerRef.current;
      if (peer) {
        peer.signal(data.signal);
      }
    });
  }, []);

  const connectToPeer = () => {
    const peer = new Peer({
      initiator: true, // If you want to initiate the call
      trickle: false,
      stream: myStreamRef.current
    });

    peer.on('signal', signal => {
      socket.emit('signal', { signal, to: otherUser, from: myID });
    });

    peer.on('stream', stream => {
      const audioElement = document.createElement('audio');
      audioElement.srcObject = stream;
      audioElement.play();
    });

    peerRef.current = peer;
    setIsConnected(true);
  };

  return (
    <div>
      <h2>Live Voice Chat</h2>
      <input
        type="text"
        placeholder="Enter other user ID"
        value={otherUser}
        onChange={(e) => setOtherUser(e.target.value)}
      />
      <button onClick={connectToPeer}>Connect</button>
      {isConnected && <p>Connected to {otherUser}</p>}
    </div>
  );
}

export default VoiceChat;
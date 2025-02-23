"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import Peer from "simple-peer";

const socket = io("https://api.claviertech.xyz"); // Replace with your backend URL

export default function Home() {
  const [email, setEmail] = useState("");
  const [room, setRoom] = useState("");
  const [messages, setMessages] = useState<
    { email: string; message: string }[]
  >([]);
  const [users, setUsers] = useState<{ email: string; id: string }[]>([]);
  const [me, setMe] = useState("");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [peer, setPeer] = useState<Peer.Instance | null>(null);
  const myVideo = useRef<HTMLVideoElement>(null);
  const userVideo = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    socket.on("room:joined", (data) => {
      console.log(`${data.email} joined`);
    });

    socket.on("room:users", (users) => {
      setUsers(users);
    });

    socket.on("room:chat", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    socket.on("video-offer", (data) => {
      handleVideoOffer(data);
    });

    socket.on("video-answer", (data) => {
      peer?.signal(data.answer);
    });

    socket.on("new-ice-candidate", (data) => {
      peer?.signal(data.candidate);
    });

    socket.on("call-ended", () => {
      peer?.destroy();
      setPeer(null);
      if (userVideo.current) userVideo.current.srcObject = null;
    });

    return () => {
      socket.disconnect();
    };
  }, [peer]);

  const joinRoom = () => {
    if (!email || !room) return;
    socket.emit("room:join", { email, room });
  };

  const sendMessage = (message: string) => {
    socket.emit("room:chat", { room, message });
  };

  const startCall = async (id: string) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    setStream(stream);
    if (myVideo.current) myVideo.current.srcObject = stream;

    const peer = new Peer({ initiator: true, trickle: false, stream });
    peer.on("signal", (offer) => {
      socket.emit("video-offer", { offer, to: id });
    });
    peer.on("stream", (userStream) => {
      if (userVideo.current) userVideo.current.srcObject = userStream;
    });
    setPeer(peer);
  };

  const handleVideoOffer = async ({
    offer,
    from,
  }: {
    offer: any;
    from: string;
  }) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    setStream(stream);
    if (myVideo.current) myVideo.current.srcObject = stream;

    const peer = new Peer({ initiator: false, trickle: false, stream });
    peer.on("signal", (answer) => {
      socket.emit("video-answer", { answer, to: from });
    });
    peer.on("stream", (userStream) => {
      if (userVideo.current) userVideo.current.srcObject = userStream;
    });
    peer.signal(offer);
    setPeer(peer);
  };

  return (
    <div>
      <h1>Video Chat App</h1>
      <input placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
      <input placeholder="Room ID" onChange={(e) => setRoom(e.target.value)} />
      <button onClick={joinRoom}>Join Room</button>

      <h3>Users in Room:</h3>
      {users.map((user) => (
        <div key={user.id}>
          {user.email} <button onClick={() => startCall(user.id)}>Call</button>
        </div>
      ))}

      <h3>Chat Messages:</h3>
      {messages.map((msg, index) => (
        <div key={index}>
          {msg.email}: {msg.message}
        </div>
      ))}

      <input
        placeholder="Message"
        onKeyDown={(e) =>
          e.key === "Enter" && sendMessage(e.currentTarget.value)
        }
      />

      <div>
        <video ref={myVideo} autoPlay playsInline muted />
        <video ref={userVideo} autoPlay playsInline />
      </div>
    </div>
  );
}

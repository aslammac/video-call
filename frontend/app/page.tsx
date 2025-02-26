/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import { useSocket } from "@/utils/socketProvider";
import { useCallback, useEffect, useRef, useState } from "react";
import { Chat as ChatIcon, ContentCopy } from "@mui/icons-material";
import VideoCall from "@/components/VideoCall";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

export default function Home() {
  const [messages, setMessages] = useState<
    { email: string; message: string; image: string | null }[]
  >([]);
  const [roomMessages, setRoomMessages] = useState<string[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [email, setEmail] = useState(localStorage.getItem("email") || "");
  const [room, setRoom] = useState(localStorage.getItem("room") || "");
  const [userEmail, setUserEmail] = useState("");
  const [userRoom, setUserRoom] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<string | ArrayBuffer | null>(null);
  const [copiedText, copyToClipboard] = useCopyToClipboard();
  const [typing, setTyping] = useState<{
    email: string;
    isTyping: boolean;
  } | null>(null);
  const socket = useSocket();

  const toggleChatWindow = () => {
    setIsChatVisible((prev) => !prev);
  };

  const handleKeyPress = (e: any) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  };

  const handleChat = useCallback(
    ({ email, message }: { email: string; message: string }) => {
      setMessages((prevMessages) => [
        ...prevMessages,
        { email, message, image: null },
      ]);
    },
    []
  );

  const sendMessage = useCallback(() => {
    if (image) {
      sendImage();
    }
    if (currentMessage.trim()) {
      socket?.emit("room:chat", {
        room: room,
        email: email,
        message: currentMessage,
      });
      setCurrentMessage("");
    }
  }, [currentMessage, room, email, socket, image]);

  const handleJoinRoom = () => {
    setEmail(userEmail);
    setRoom(userRoom);
    localStorage.setItem("email", userEmail);
    localStorage.setItem("room", userRoom);
    socket?.emit("room:join", { room: userRoom, email: userEmail });
  };

  const handleLeaveRoom = () => {
    setEmail("");
    setRoom("");
    localStorage.removeItem("email");
    localStorage.removeItem("room");
    socket?.emit("room:leave", { room, email });
  };

  const handleImageChange = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result); // Store the base64-encoded image
      };
      reader.readAsDataURL(file);
    }
  };

  const sendImage = () => {
    if (image) {
      // Send the base64 image data to the server
      socket?.emit("room:chat-image", { room, email, image });
      setImage(null);
    }
  };

  const handleTyping = () => {
    socket?.emit("typing", { room, isTyping: true, email });

    setTimeout(() => {
      socket?.emit("typing", { room, isTyping: false, email });
    }, 3000); // Stop typing after 3 seconds
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    socket?.on("room:chat", handleChat);
    socket?.on("user:joined", (data) => {
      if (data.email === email) {
        setRoomMessages((prev: any) => [...prev, `You have joined the room!`]);
      } else {
        setRoomMessages((prev: any) => [
          ...prev,
          `${data.email} has joined the room!`,
        ]);
      }
    });
    socket?.on("user:leave", (data) => {
      setRoomMessages((prev: any) => [
        ...prev,
        `${data.email} has left the room!`,
      ]);
    });

    socket?.on("room:chat-image", ({ image, email }) => {
      // console.log('Received image from server: ', email, image);
      // Here you can display the image or process it
      // You could set it in the state if you want to render it
      setMessages((prevMessages) => [
        ...prevMessages,
        { email, message: "", image },
      ]);
    });
    socket?.on("typing", ({ email: emailId, isTyping }) => {
      if (emailId !== email) {
        setTyping({
          email: emailId,
          isTyping,
        });
      }
    });
    return () => {
      socket?.off("room:chat");
      socket?.off("user:leave");
      socket?.off("user:joined");
      socket?.off("room:chat-image");
      socket?.off("typing");
    };
  }, [socket, handleChat]);

  useEffect(() => {
    if (email && room) {
      socket?.emit("room:join", { room, email });
    }
  }, [email, room, socket]);

  return (
    <div className=" items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <VideoCall />
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        {/* 
        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <Link href="/room">
            <div className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5">
              <Image
                className="dark:invert"
                src="/vercel.svg"
                alt="Vercel logomark"
                width={20}
                height={20}
              />
              Enter Room 3
            </div>
          </Link>
          
          
        </div> */}
        {/* <h2>Room Messages</h2> */}
        <div className="absolute left-0 bottom-0 p-4  border-t border-none border-black/[.08] dark:border-white/[.145] w-full">
          {roomMessages.map((msg, index) => (
            <p key={index}>{msg}</p>
          ))}
        </div>
      </main>
      <button className="chat-icon" onClick={toggleChatWindow}>
        <ChatIcon fontSize="large" />
      </button>
      {isChatVisible &&
        (email && room ? (
          <div className="chat-window m-3 max-w-96 overflow-scroll max-h-[80vh]">
            <div className="messages">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`message relative ${
                    msg.email === email ? "message-right" : "message-left"
                  }`}
                >
                  {msg.message}
                  {msg.image && (
                    <img
                      src={msg.image}
                      alt="Sent image"
                      className="chat-image"
                    />
                  )}
                  <ContentCopy
                    className="absolute right-2 text-xs text-gray-400 cursor-pointer"
                    onClick={() => {
                      copyToClipboard && copyToClipboard(msg.message);
                    }}
                  />
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div>
              {image && (
                <img src={image as string} alt="Preview" className="w-20" />
              )}
            </div>
            <div className="flex gap-4">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full"
              />
            </div>
            <div className="px-2 text-gray-500 h-6">
              {typing?.isTyping && <p> {typing.email} is typing... </p>}
            </div>
            <div className="input-area">
              <input
                type="text"
                value={currentMessage}
                onChange={(e) => {
                  setCurrentMessage(e.target.value);
                  handleTyping();
                }}
                placeholder="Type a message..."
                onKeyDown={handleKeyPress}
              />
              <button onClick={sendMessage}>Send</button>
            </div>
            <button onClick={() => setImage(null)}>Clear</button>
            <button onClick={handleLeaveRoom} className="text-red-500">
              Leave Room
            </button>
          </div>
        ) : (
          <div className="chat-window m-3 max-w-96 overflow-scroll max-h-[80vh]">
            <input
              type="text"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="Enter your email"
            />
            <input
              type="text"
              value={userRoom}
              onChange={(e) => setUserRoom(e.target.value)}
              placeholder="Enter room number"
            />
            <button onClick={handleJoinRoom}>Join Room</button>
          </div>
        ))}
    </div>
  );
}

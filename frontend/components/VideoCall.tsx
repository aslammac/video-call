"use client";
import { useEffect, useRef, useState } from "react";
import { useSocket } from "@/utils/socketProvider";

const VideoCall: React.FC = () => {
  const [isInCall, setIsInCall] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]); // Store ICE candidates
  const room = localStorage.getItem("room");
  const email = localStorage.getItem("email");
  const [user, setUser] = useState("");
  const [users, setUsers] = useState<{ email: string; id: string }[]>([]);
  const socket = useSocket();

  useEffect(() => {
    socket?.emit("request-user-list", room);

    socket?.on("user-list", (users: { email: string; id: string }[]) => {
      setUsers(users.filter((u) => u.email !== email));
    });

    socket?.on("video-offer", handleVideoOffer);
    socket?.on("video-answer", handleVideoAnswer);
    socket?.on("new-ice-candidate", handleNewICECandidate);
    socket?.on("call-ended", handleCallEnded);

    return () => {
      socket?.off("user-list");
      socket?.off("video-offer");
      socket?.off("video-answer");
      socket?.off("new-ice-candidate");
      socket?.off("call-ended");
    };
  }, [socket]);

  useEffect(() => {
    startVideo();
    if (email && room) {
      socket?.emit("room:join", { room, email });
    }
  }, [email, room, socket]);

  const startVideo = async (): Promise<MediaStream> => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
    return stream;
  };

  const handleVideoOffer = async ({
    offer,
    to,
  }: {
    offer: RTCSessionDescriptionInit;
    to: string;
  }) => {
    console.log("Received video offer:", offer);
    const peerConnection = new RTCPeerConnection();
    peerRef.current = peerConnection;

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket?.emit("new-ice-candidate", { candidate: event.candidate, to });
      }
    };

    peerConnection.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    const stream = await startVideo();
    stream
      .getTracks()
      .forEach((track) => peerConnection.addTrack(track, stream));

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

    // Process any pending ICE candidates
    while (pendingCandidates.current.length) {
      const candidate = pendingCandidates.current.shift();
      if (candidate) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    }

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    setIsInCall(true);
    socket?.emit("video-answer", { answer, to });
  };

  const handleVideoAnswer = ({
    answer,
  }: {
    answer: RTCSessionDescriptionInit;
  }) => {
    if (peerRef.current) {
      peerRef.current
        .setRemoteDescription(new RTCSessionDescription(answer))
        .then(() => {
          while (pendingCandidates.current.length) {
            const candidate = pendingCandidates.current.shift();
            if (candidate) {
              peerRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
            }
          }
        });
    }
  };

  const handleNewICECandidate = (candidate: RTCIceCandidateInit) => {
    if (peerRef.current && peerRef.current.remoteDescription) {
      peerRef.current
        .addIceCandidate(new RTCIceCandidate(candidate))
        .catch(console.error);
    } else {
      pendingCandidates.current.push(candidate);
    }
  };

  const startCall = async () => {
    const stream = await startVideo();
    const peerConnection = new RTCPeerConnection();
    peerRef.current = peerConnection;

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket?.emit("new-ice-candidate", {
          candidate: event.candidate,
          to: user,
        });
      }
    };

    peerConnection.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    stream
      .getTracks()
      .forEach((track) => peerConnection.addTrack(track, stream));

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    setIsInCall(true);
    socket?.emit("video-offer", { offer, to: user });
  };

  const endCall = () => {
    if (localVideoRef.current?.srcObject) {
      (localVideoRef.current.srcObject as MediaStream)
        .getTracks()
        .forEach((track) => track.stop());
    }
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    socket?.emit("call-ended", { room, email });
    setIsInCall(false);
  };

  const handleCallEnded = () => {
    console.log("Call ended");
    endCall();
  };

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="relative flex gap-4 rounded-xl overflow-clip h-auto">
        <div className="absolute rounded-xl overflow-clip h-32 my-4 left-3">
          <video ref={localVideoRef} autoPlay muted />
        </div>
        <video ref={remoteVideoRef} autoPlay />
      </div>
      {!isInCall ? (
        <div>
          <div className="py-4">
            <select
              className="border border-solid border-transparent rounded-md transition-colors bg-foreground text-background hover:bg-[#383838] dark:hover:bg-[#ccc] text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
              onChange={(e) => setUser(e.target.value)}
            >
              <option>Select User</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.email}
                </option>
              ))}
            </select>
          </div>
          <div
            onClick={startCall}
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
          >
            Start Call
          </div>
        </div>
      ) : (
        <div
          onClick={endCall}
          className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-red-900 text-background gap-2 hover:bg-[#c24040] dark:hover:bg-[#ccc] text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 mt-3"
        >
          End Call
        </div>
      )}
    </div>
  );
};

export default VideoCall;

// "use client";
// import { useEffect, useRef, useState } from "react";
// import { useSocket } from "@/lib/socketProvider";

// const VideoCall: React.FC = () => {
//   const [isInCall, setIsInCall] = useState(false);
//   const localVideoRef = useRef<HTMLVideoElement>(null);
//   const remoteVideoRef = useRef<HTMLVideoElement>(null);
//   const peerRef = useRef<RTCPeerConnection | null>(null);
//   const pendingCandidates: RTCIceCandidateInit[] = []; // Store ICE candidates
//   const room = localStorage.getItem("room");
//   const email = localStorage.getItem("email");
//   const [user, setUser] = useState("");
//   const [users, setUsers] = useState<
//     {
//       email: string;
//       id: string;
//     }[]
//   >();
//   const socket = useSocket();

//   useEffect(() => {
//     // startVideo();
//     socket?.emit("request-user-list", room);
//     socket?.on(
//       "user-list",
//       (
//         users: {
//           email: string;
//           id: string;
//         }[]
//       ) => {
//         console.log(users);
//         setUsers(users.filter((user) => user.email !== email));
//       }
//     );
//     socket?.on("video-offer", handleVideoOffer);
//     socket?.on("video-answer", handleVideoAnswer);
//     socket?.on("new-ice-candidate", handleNewICECandidate);
//     socket?.on("call-ended", () => {
//       console.log("Call ended");
//       clearVideoElements();
//       closePeerConnection();
//       setIsInCall(false);
//     });
//   }, []);

//   useEffect(() => {
//     startVideo();
//     if (email && room) {
//       socket?.emit("room:join", { room, email });
//     }
//   }, [email, room, socket]);

//   // Initialize the local video stream
//   const startVideo = async (): Promise<MediaStream> => {
//     const stream = await navigator.mediaDevices.getUserMedia({
//       video: true,
//       audio: true,
//     });
//     if (localVideoRef.current) {
//       console.log(stream);
//       localVideoRef.current.srcObject = stream;
//     }

//     return stream;
//   };

//   const handleVideoOffer = async ({
//     offer,
//     to,
//   }: {
//     offer: any;
//     to: string;
//   }) => {
//     console.log("Received video offer:", offer);

//     // Create a new peer connection
//     console.log("Creating new peer connection");
//     const peerConnection = new RTCPeerConnection();
//     peerRef.current = peerConnection;
//     console.log("New peer connection created:", peerConnection);

//     // Add ICE candidates
//     console.log("Adding ICE candidates");
//     peerConnection.onicecandidate = (event) => {
//       console.log("ICE candidate:", event.candidate);
//       if (event.candidate) {
//         socket?.emit("new-ice-candidate", { candidate: event.candidate, to });
//       }
//     };
//     console.log("ICE candidates added");

//     // Handle the remote stream
//     console.log("Handling remote stream");
//     peerConnection.ontrack = (event) => {
//       console.log("Received remote track:", event);
//       if (remoteVideoRef.current && event.streams[0]) {
//         console.log("Setting remote stream:", event.streams[0]);
//         remoteVideoRef.current.srcObject = event.streams[0];
//       } else {
//         console.error("Remote stream is not available.");
//       }
//     };
//     console.log("Remote stream handled");

//     const stream = await startVideo();

//     // Add local stream to the peer connection
//     stream
//       .getTracks()
//       .forEach((track) => peerConnection.addTrack(track, stream));
//     console.log(offer);

//     await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

//     const answer = await peerConnection.createAnswer();
//     await peerConnection.setLocalDescription(answer);

//     setIsInCall(true);

//     // Send the answer back to the offer sender
//     console.log("Sending video answer:", answer);
//     socket?.emit("video-answer", {
//       answer,
//       to,
//     });
//   };

//   const handleVideoAnswer = ({ answer, to }: { answer: any; to: string }) => {
//     console.log("Received video answer:", answer);
//     console.log(answer);
//     if (peerRef.current) {
//       peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
//     }
//     console.log("Remote description set");
//   };

//   const handleNewICECandidate = (candidate: RTCIceCandidate) => {
//     console.log("Received new ICE candidate:", candidate);
//     if (peerRef.current) {
//       peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
//     }
//     console.log("ICE candidate added");
//   };

//   const startCall = async () => {
//     const stream = await startVideo();
//     const peerConnection = new RTCPeerConnection();

//     peerRef.current = peerConnection;

//     peerConnection.onicecandidate = (event) => {
//       if (event.candidate) {
//         socket?.emit("new-ice-candidate", {
//           candidate: event.candidate,
//           to: user,
//         });
//       }
//     };

//     peerConnection.ontrack = (event) => {
//       if (remoteVideoRef.current) {
//         console.log("Setting remote stream:", event.streams[0]);
//         remoteVideoRef.current.srcObject = event.streams[0];
//       }
//     };

//     stream
//       .getTracks()
//       .forEach((track) => peerConnection.addTrack(track, stream));

//     const offer = await peerConnection.createOffer();
//     await peerConnection.setLocalDescription(offer);
//     setIsInCall(true);
//     // Send the offer to the other user
//     socket?.emit("video-offer", {
//       offer,
//       to: user,
//     });
//   };

//   const endCall = () => {
//     // Stop local media tracks
//     if (localVideoRef.current && localVideoRef.current.srcObject) {
//       const stream = localVideoRef.current.srcObject as MediaStream;
//       stopMediaTracks(stream);
//     }

//     // Close peer connection
//     closePeerConnection();

//     // Clear video elements
//     clearVideoElements();

//     // Notify the server (optional)
//     notifyServerCallEnded();

//     // Update state
//     setIsInCall(false);
//   };

//   const stopMediaTracks = (stream: MediaStream) => {
//     stream.getTracks().forEach((track) => {
//       track.stop(); // Stop each track (audio/video)
//     });
//   };

//   const closePeerConnection = () => {
//     if (peerRef.current) {
//       peerRef.current.close();
//       peerRef.current = null;
//     }
//   };

//   const clearVideoElements = () => {
//     if (localVideoRef.current) {
//       localVideoRef.current.srcObject = null;
//     }
//     if (remoteVideoRef.current) {
//       remoteVideoRef.current.srcObject = null;
//     }
//   };

//   const notifyServerCallEnded = () => {
//     if (socket) {
//       socket.emit("call-ended", { room, email });
//     }
//   };

//   return (
//     <div>
//       <div className="flex flex-col items-center justify-center h-full">
//         <div className="relative flex gap-4 rounded-xl overflow-clip h-auto">
//           <div className="absolute rounded-xl overflow-clip h-32 my-4 left-3">
//             <video ref={localVideoRef} autoPlay muted />
//           </div>
//           <video ref={remoteVideoRef} autoPlay muted />
//         </div>
//         {!isInCall ? (
//           <div>
//             <div className="py-4">
//               <select
//                 className="border border-solid border-transparent rounded-md transition-colors bg-foreground text-background hover:bg-[#383838] dark:hover:bg-[#ccc] text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
//                 onChange={(e) => setUser(e.target.value)}
//               >
//                 <option>Select User</option>
//                 {users?.map((user) => (
//                   <option key={user.id} value={user.id}>
//                     {user.email}
//                   </option>
//                 ))}
//               </select>
//             </div>
//             <div
//               onClick={startCall}
//               className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
//             >
//               Start Call
//             </div>
//           </div>
//         ) : (
//           <div
//             onClick={endCall}
//             className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-red-900 text-background gap-2 hover:bg-[#c24040] dark:hover:bg-[#ccc] text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 mt-3"
//           >
//             End Call
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default VideoCall;

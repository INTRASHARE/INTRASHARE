import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

import Chat from "@/components/Chat/Chat";
import ChatList from "@/components/Chatlist/ChatList";
import { useRouter } from "next/router";
import { useStateProvider } from "@/context/StateContext";
import { reducerCases } from "@/context/constants";
import axios from "axios";
import { GET_MESSAGES_ROUTE, HOST } from "@/utils/ApiRoutes";
import Empty from "./Empty";
import VideoCall from "./Call/VideoCall";
import VoiceCall from "./Call/VoiceCall";
import IncomingCall from "./common/IncomingCall";
import IncomingVideoCall from "./common/IncomingVideoCall";
import LoadingSpinner from "./common/LoadingSpinner";
import SearchMessages from "./Chat/SearchMessages";

export default function Main() {
  const [
    {
      userInfo,
      currentChatUser, 
      videoCall,
      voiceCall,
      incomingVoiceCall,
      incomingVideoCall,
      messageSearch,
      userContacts,
    } = {},
    dispatch,
  ] = useStateProvider() || [{}]; 
  
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const socket = useRef();
  const [socketEvent, setSocketEvent] = useState(false);

  useEffect(() => {
    const redirectIfNotLoggedIn = async () => {
      try {
        if (userInfo === undefined) {
          await router.push("/login"); // Redirect to login page if user is not logged in
        }

        socket.current = io(HOST);
        socket.current.emit("add-user", userInfo.id);
        dispatch({ type: reducerCases.SET_SOCKET, socket });

        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        // Handle error
      }
    };

    redirectIfNotLoggedIn();
  }, [userInfo]);

  useEffect(() => {
    if (socket.current && !socketEvent) {
      socket.current.on("msg-recieve", (data) => {
        dispatch({
          type: reducerCases.ADD_MESSAGE,
          newMessage: {
            ...data.message,
          },
        });
      });

      socket.current.on("online-users", ({ onlineUsers }) => {
        dispatch({
          type: reducerCases.SET_ONLINE_USERS,
          onlineUsers,
        });
      });

      socket.current.on("mark-read-recieve", ({ id, recieverId }) => {
        dispatch({
          type: reducerCases.SET_MESSAGES_READ,
          id,
          recieverId,
        });
      });

      socket.current.on("incoming-voice-call", ({ from, roomId, callType }) => {
        dispatch({
          type: reducerCases.SET_INCOMING_VOICE_CALL,
          incomingVoiceCall: { ...from, roomId, callType },
        });
      });

      socket.current.on("voice-call-rejected", () => {
        dispatch({
          type: reducerCases.SET_INCOMING_VOICE_CALL,
          incomingVoiceCall: undefined,
        });
        dispatch({
          type: reducerCases.SET_VOICE_CALL,
          voiceCall: undefined,
        });
      });

      socket.current.on("incoming-video-call", ({ from, roomId, callType }) => {
        dispatch({
          type: reducerCases.SET_INCOMING_VIDEO_CALL,
          incomingVideoCall: { ...from, roomId, callType },
        });
      });

      socket.current.on("video-call-rejected", () => {
        dispatch({
          type: reducerCases.SET_INCOMING_VIDEO_CALL,
          incomingVideoCall: undefined,
        });
        dispatch({
          type: reducerCases.SET_VIDEO_CALL,
          videoCall: undefined,
        });
      });

      setSocketEvent(true);
    }
  }, [socket.current]);

  useEffect(() => {
    const getMessages = async () => {
      const {
        data: { messages },
      } = await axios.get(
        `${GET_MESSAGES_ROUTE}/${userInfo.id}/${currentChatUser.id}`
      );
      dispatch({ type: reducerCases.SET_MESSAGES, messages });
    };
    if (
      currentChatUser &&
      userContacts.findIndex((contact) => contact.id === currentChatUser.id) !==
      -1
    ) {
      getMessages();
    }
  }, [currentChatUser]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      {incomingVoiceCall && <IncomingCall />}
      {incomingVideoCall && <IncomingVideoCall />}

      {videoCall && (
        <div className="h-screen w-screen max-h-full max-w-full overflow-hidden">
          <VideoCall />
        </div>
      )}
      {voiceCall && (
        <div className="h-screen w-screen max-h-full max-w-full overflow-hidden">
          <VoiceCall />
        </div>
      )}
      {!videoCall && !voiceCall && (
        <div className="grid grid-cols-main h-screen w-screen max-h-screen max-w-full overflow-hidden">
          <ChatList />
          {currentChatUser ? (
            <div className={messageSearch ? "grid grid-cols-2" : "grid-cols-2"}>
              <Chat />
              {messageSearch && <SearchMessages />}
            </div>
          ) : (
            <Empty />
          )}
        </div>
      )}
    </>
  );
}

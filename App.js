import { useState, useEffect } from "react";
import LoginScreen from "./src/screens/LoginScreen";
import MainContainer from "./src/screens/MainContainer";
import { registerForPushNotificationsAsync } from "./src/services/notificationService";

export default function App() {
  const [session, setSession] = useState(null);

  if (!session) {
    return <LoginScreen setSession={setSession} />;
  }

  return <MainContainer session={session} setSession={setSession} />;
}

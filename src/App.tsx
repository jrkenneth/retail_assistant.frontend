import { ChatWorkspace } from "./features/chat/ChatWorkspace";
import { PresentationViewerPage } from "./features/presentations/PresentationViewerPage";

function App() {
  const path = window.location.pathname;

  if (path === "/chat" || path === "/") {
    return <ChatWorkspace />;
  }

  if (path.startsWith("/viewer/")) {
    return <PresentationViewerPage />;
  }

  return <ChatWorkspace />;
}

export default App;

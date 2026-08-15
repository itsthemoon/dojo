import { useEffect } from "react";
import { useHashRoute } from "./hooks/useHashRoute";
import { classById } from "./lib/store";
import { ClassPicker } from "./components/ClassPicker";
import { DisplayBoard } from "./components/DisplayBoard";
import { TeacherBoard } from "./components/TeacherBoard";

export default function App() {
  const [route, navigate] = useHashRoute();

  useEffect(() => {
    if (route.page === "picker") {
      document.title = "Star Catcher";
    } else {
      const cls = classById(route.classId);
      document.title = cls ? `${cls.name} · Star Catcher` : "Star Catcher";
    }
  }, [route]);

  switch (route.page) {
    case "board":
      return <TeacherBoard classId={route.classId} onExit={() => navigate("/")} />;
    case "display":
      return <DisplayBoard classId={route.classId} onExit={() => navigate("/")} />;
    default:
      return <ClassPicker onOpenClass={(id) => navigate(`/class/${id}`)} />;
  }
}

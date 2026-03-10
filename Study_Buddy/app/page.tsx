import Image from "next/image";
import Navbar from "./components/Navbar";
import Taskboard from "./components/Taskboard";
import Progresschart from "./components/Progresschart";
import "../app/styles/Dashboard.css"

export default function Home() {
  return (
    <Navbar/>
  );
}

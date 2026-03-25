import Image from "next/image";
import Navbar from "../components/Navbar";
import Taskboard from "../components/Taskboard";
import Progresschart from "../components/Progresschart";
import "../../app/styles/Dashboard.css"

export default function dashboard() {
  return (
    <div>
        <div className="dashboard">
            <div className="child">
                <Taskboard />
            </div>
            <div className="child">
                <Progresschart />
            </div>
        </div>
    </div>
  );
}

import Image from "next/image";
import Navbar from "../components/Navbar";
import "../../app/styles/Tasks.css"

export default function task() {
  return (
    <div className="container">
        ADD NEW TASK
        <div>
          <label className="taskItem">
              Task Name: <input name="myInput"/>
          </label>
          <label className="taskItem">
              Subject: <input name="myInput"/>
          </label>
          <label className="taskItem">
              Due Date: <input name="myInput"/>
          </label>
          <label className="taskItem">
              Priority: <input name="myInput"/>
          </label>
        </div>
        <a>
          <button className="taskButton">
            Save Task
          </button>
        </a>
    </div>
  );
}

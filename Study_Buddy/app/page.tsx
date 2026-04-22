import Image from "next/image";
import Navbar from "./components/Navbar";
import Taskboard from "./components/Taskboard";
import Progresschart from "./components/Progresschart";
import "../app/styles/landing.css"

export default function Home() { //Must wrap the details in this exxport function.
  return (
    <div>
          <nav>
              <h2>Smart Study Planner</h2>
              <div>
                  <a href="#features">Features</a>
                  <a href="#how">How It Works</a>
                  <a href="#contact">Contact</a>
              </div>
          </nav>

          <section className ="hero">
              <h1>Organize Your Time. Optimize Your Future.</h1>
              <p>Smart scheduling, task tracking, and productivity insights — all in one place.</p>
              <button className="primary-btn">Get Started</button> 
          </section>

          <section className="section" id="features">
              <h2>Powerful Features</h2>
              <div className="features">
                  <div className="card">
                      <h3>Smart Scheduling</h3>
                      <p>Automatically calculates available hours and builds personalized study plans.</p>
                  </div>
                  <div className="card">
                      <h3>Task Management</h3>
                      <p>Create tasks, log study sessions, and track completion progress.</p>
                  </div>
                  <div className="card">
                      <h3>Weekly & Monthly Insights</h3>
                      <p>See productivity analytics and optimization suggestions.</p>
                  </div>
              </div>
          </section>

          <section className="section" id="how">
              <h2>How It Works</h2>
              <p>Input your schedule → Add tasks → Track time → Get smart recommendations.</p>
          </section>

          <section className="section" id="contact">
              <h2>Built for Students</h2>
              <p>A project designed to help students balance academic performance and personal time efficiently.</p>
          </section>

          <footer className="footer">
              <p>© 2026 Smart Study Planner | Built with GitHub Pages</p>
          </footer>

    </div>
  );
}

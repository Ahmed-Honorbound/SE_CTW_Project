import React from 'react'
import "../styles/Taskboard.css";

function Taskboard() {
  return (
    <div className='taskboard'>
        <h1>TODAY'S TASKS</h1>
        {/* This will be replaced with a component that updates with tasks */}
        <div className='taskItems'>
            <div className='tasks'>
              <h1>
                Math Homework
              </h1>
                  Details:
                  <ul>
                    <li>
                      Due Date: XX/XX/XX 
                    </li>
                    <li>
                      Type: Math
                    </li>
                  </ul> 
            </div>
            <div className='tasks'>
              <h1>
                Study Chapter 5
              </h1>
                  Details:
                  <ul>
                    <li>
                      Due Date: XX/XX/XX 
                    </li>
                    <li>
                      Type: Math
                    </li>
                  </ul> 
            </div>
            <div className='tasks'>
              <h1>
                Project Work
              </h1>
                  Details:
                  <ul>
                    <li>
                      Due Date: XX/XX/XX 
                    </li>
                    <li>
                      Type: Math
                    </li>
                  </ul> 
            </div>

        </div>
    </div>
  )
}

export default Taskboard;
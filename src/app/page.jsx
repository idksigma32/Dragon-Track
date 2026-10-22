
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BarChart3, CheckCircle2, Users, ClipboardList } from "lucide-react";

const students = [
  "Avery Bennett", "Jordan Kim", "Maya Patel", "Ethan Brooks",
  "Sofia Rivera", "Noah Williams", "Isabella Chen", "Liam Thompson",
  "Amara Johnson", "Lucas Martinez", "Harper Davis", "Elijah Wilson",
  "Zoe Anderson", "Mateo Garcia", "Nina Thompson", "Caleb Moore",
  "Layla Robinson", "Owen Clark", "Priya Shah", "Finn Murphy",
];

const deliverables = [
  "Quiz 1", "Essay 1", "Lab Report", "Project Draft",
  "Presentation", "Quiz 2", "Research", "Final Project",
];

const colors = {
  "Not Started": "bg-white hover:bg-gray-100",
  "In Progress": "bg-yellow-200 hover:bg-yellow-300",
  Completed: "bg-green-300 hover:bg-green-400",
  Incomplete: "bg-red-200 hover:bg-red-300",
  Skipped: "bg-orange-200 hover:bg-orange-300",
};

const options = Object.keys(colors);

export default function Dashboard() {
  const [data, setData] = useState({});
  const [search, setSearch] = useState("");

  const status = (student, task) =>
    data[`${student}-${task}`] || "Not Started";

  function changeStatus(student, task) {
    const key = `${student}-${task}`;
    const next = (options.indexOf(status(student, task)) + 1) % options.length;
    setData({ ...data, [key]: options[next] });
  }

  const completed = Object.values(data).filter(
    (s) => s === "Completed"
  ).length;

  const total = students.length * deliverables.length;
  const percent = Math.round((completed / total) * 100);

  const stats = [
    { label: "Students", value: students.length, icon: Users },
    { label: "Deliverables", value: deliverables.length, icon: ClipboardList },
    { label: "Completed", value: completed, icon: CheckCircle2 },
    { label: "Overall Progress", value: `${percent}%`, icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Badge className="mb-2 bg-orange-100 text-orange-700">
          DragonTrack
        </Badge>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Track student progress and manage deliverables.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((item) => (
          <Card key={item.label} className="rounded-2xl shadow-sm">
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {item.label}
                </p>
                <p className="mt-2 text-3xl font-bold">
                  {item.value}
                </p>
              </div>
              <item.icon className="size-7 text-orange-500" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Student Progress Tracker</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Click any square to change its status.
            </p>
          </div>
          <Input
            placeholder="Search students..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-48"
          />
        </CardHeader>

        <CardContent>
          <div className="mb-4 flex flex-wrap gap-3 text-xs">
            {options.map((option) => (
              <span key={option} className="flex items-center gap-1">
                <span
                  className={`size-3 rounded border ${colors[option]}`}
                />
                {option}
              </span>
            ))}
          </div>

          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[850px] text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="sticky left-0 z-10 bg-gray-50 p-3 text-left">
                    Student
                  </th>
                  {deliverables.map((task) => (
                    <th key={task} className="p-3 text-center text-xs">
                      {task}
                    </th>
                  ))}
                  <th className="p-3">Progress</th>
                </tr>
              </thead>

              <tbody>
                {students
                  .filter((name) =>
                    name.toLowerCase().includes(search.toLowerCase())
                  )
                  .map((student) => {
                    const done = deliverables.filter(
                      (task) => status(student, task) === "Completed"
                    ).length;

                    return (
                      <tr key={student} className="border-t">
                        <td className="sticky left-0 bg-white p-3 font-medium whitespace-nowrap">
                          {student}
                        </td>

                        {deliverables.map((task) => (
                          <td key={task} className="p-2 text-center">
                            <button
                              type="button"
                              title={`${task}: ${status(student, task)}`}
                              aria-label={`${student}, ${task}: ${status(student, task)}. Click to change.`}
                              onClick={() => changeStatus(student, task)}
                              className={`mx-auto size-9 cursor-pointer rounded-lg border transition ${colors[status(student, task)]}`}
                            />
                          </td>
                        ))}

                        <td className="min-w-28 p-3">
                          <div className="flex items-center gap-2">
                            <Progress
                              value={(done / deliverables.length) * 100}
                              className="h-2"
                            />
                            <span className="text-xs">
                              {done}/{deliverables.length}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Overall Class Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              Completed Deliverables
            </span>
            <span className="text-2xl font-bold">{percent}%</span>
          </div>

          <Progress value={percent} className="h-4" />

          <p className="text-sm text-muted-foreground">
            {completed} of {total} student deliverables completed.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {deliverables.map((task) => {
              const done = students.filter(
                (student) => status(student, task) === "Completed"
              ).length;

              return (
                <div key={task} className="rounded-xl border p-4">
                  <div className="mb-2 flex justify-between text-sm">
                    <span>{task}</span>
                    <span>{done}/{students.length}</span>
                  </div>
                  <Progress
                    value={(done / students.length) * 100}
                    className="h-2"
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Button
        variant="outline"
        onClick={() => setData({})}
      >
        Reset Demo Data
      </Button>
    </div>
  );
}

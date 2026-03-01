"use client";

import { useState } from "react";

interface RenderScreenProps {
  type: "select-one" | "select-multi" | "text" | "auth";
  prompt: string;
  options?: string[];
  onSubmit: (value: string) => void;
}

export function RenderScreen({ type, prompt, options, onSubmit }: RenderScreenProps) {
  const [textValue, setTextValue] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  if (type === "select-one") {
    return (
      <div className="flex flex-col items-center gap-6 p-8">
        <h2 className="text-center text-2xl font-semibold">{prompt}</h2>
        <div className="flex w-full max-w-lg flex-col gap-3">
          {options?.map((option) => (
            <button
              key={option}
              onClick={() => onSubmit(option)}
              className="rounded-xl border-2 border-primary/20 bg-card px-6 py-4 text-left text-lg font-medium transition-colors hover:border-primary hover:bg-primary/5 active:bg-primary/10"
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (type === "select-multi") {
    return (
      <div className="flex flex-col items-center gap-6 p-8">
        <h2 className="text-center text-2xl font-semibold">{prompt}</h2>
        <div className="flex w-full max-w-lg flex-col gap-3">
          {options?.map((option) => {
            const isSelected = selectedOptions.includes(option);
            return (
              <button
                key={option}
                onClick={() =>
                  setSelectedOptions((prev) =>
                    isSelected
                      ? prev.filter((o) => o !== option)
                      : [...prev, option],
                  )
                }
                className={`rounded-xl border-2 px-6 py-4 text-left text-lg font-medium transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-primary/20 bg-card hover:border-primary/40"
                }`}
              >
                <span className="mr-3 inline-block h-5 w-5 rounded border-2 border-current align-middle">
                  {isSelected && <span className="block h-full w-full rounded-sm bg-primary" />}
                </span>
                {option}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => onSubmit(selectedOptions.join(", "))}
          disabled={selectedOptions.length === 0}
          className="rounded-xl bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground transition-opacity disabled:opacity-50"
        >
          Submit
        </button>
      </div>
    );
  }

  if (type === "text") {
    return (
      <div className="flex flex-col items-center gap-6 p-8">
        <h2 className="text-center text-2xl font-semibold">{prompt}</h2>
        <textarea
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          placeholder="Type your answer here..."
          className="w-full max-w-lg rounded-xl border-2 border-primary/20 bg-card p-4 text-lg focus:border-primary focus:outline-none"
          rows={4}
        />
        <button
          onClick={() => onSubmit(textValue)}
          disabled={!textValue.trim()}
          className="rounded-xl bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground transition-opacity disabled:opacity-50"
        >
          Submit
        </button>
      </div>
    );
  }

  if (type === "auth") {
    return (
      <div className="flex flex-col items-center gap-6 p-8">
        <h2 className="text-center text-2xl font-semibold">{prompt}</h2>
        <p className="max-w-md text-center text-lg text-muted-foreground">
          Please log in using the browser on the left side of the screen. When
          you are done, click the button below.
        </p>
        <button
          onClick={() => onSubmit("User completed authentication")}
          className="rounded-xl bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground"
        >
          I&apos;m Done Logging In
        </button>
      </div>
    );
  }

  return null;
}

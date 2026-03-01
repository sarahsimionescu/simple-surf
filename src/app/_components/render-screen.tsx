"use client";

import { useState } from "react";

interface RenderScreenProps {
  type: "select-one" | "select-multi" | "text" | "auth";
  prompt: string;
  options?: string[];
  onSubmit: (value: string) => void;
}

// shared submit button
function SubmitButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="cursor-pointer rounded-full bg-[#141414] px-10 py-4 text-base font-semibold text-[#F7F7F5] transition-all duration-300 hover:bg-[#0077B6] disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0077B6]"
    >
      {children}
    </button>
  );
}

// shared option button
function OptionButton({
  onClick,
  selected,
  children,
}: {
  onClick: () => void;
  selected?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`cursor-pointer rounded-xl border px-6 py-4 text-left text-base font-medium transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0077B6] ${
        selected
          ? "border-[#0077B6] bg-[#0077B6]/10 text-[#141414]"
          : "border-[#141414]/10 bg-white text-[#141414] hover:border-[#0077B6]/40 hover:shadow-sm"
      }`}
    >
      {children}
    </button>
  );
}

export function RenderScreen({ type, prompt, options, onSubmit }: RenderScreenProps) {
  const [textValue, setTextValue] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  if (type === "select-one") {
    return (
      <div className="flex flex-col items-center gap-6 rounded-2xl bg-white p-8 shadow-[0_4px_60px_rgba(0,0,0,0.06)]">
        <h2 className="text-center text-xl font-bold text-[#141414]">
          {prompt}
        </h2>
        <div className="flex w-full max-w-lg flex-col gap-3">
          {options?.map((option) => (
            <OptionButton key={option} onClick={() => onSubmit(option)}>
              {option}
            </OptionButton>
          ))}
        </div>
      </div>
    );
  }

  if (type === "select-multi") {
    return (
      <div className="flex flex-col items-center gap-6 rounded-2xl bg-white p-8 shadow-[0_4px_60px_rgba(0,0,0,0.06)]">
        <h2 className="text-center text-xl font-bold text-[#141414]">
          {prompt}
        </h2>
        <div className="flex w-full max-w-lg flex-col gap-3">
          {options?.map((option) => {
            const isSelected = selectedOptions.includes(option);
            return (
              <OptionButton
                key={option}
                selected={isSelected}
                onClick={() =>
                  setSelectedOptions((prev) =>
                    isSelected
                      ? prev.filter((o) => o !== option)
                      : [...prev, option],
                  )
                }
              >
                <span className="mr-3 inline-flex h-5 w-5 items-center justify-center rounded border-2 border-current align-middle">
                  {isSelected && (
                    <span className="block h-2.5 w-2.5 rounded-sm bg-[#0077B6]" />
                  )}
                </span>
                {option}
              </OptionButton>
            );
          })}
        </div>
        <SubmitButton
          onClick={() => onSubmit(selectedOptions.join(", "))}
          disabled={selectedOptions.length === 0}
        >
          Submit
        </SubmitButton>
      </div>
    );
  }

  if (type === "text") {
    return (
      <div className="flex flex-col items-center gap-6 rounded-2xl bg-white p-8 shadow-[0_4px_60px_rgba(0,0,0,0.06)]">
        <h2 className="text-center text-xl font-bold text-[#141414]">
          {prompt}
        </h2>
        <textarea
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          placeholder="Type your answer here..."
          className="w-full max-w-lg rounded-xl border border-[#141414]/10 bg-[#F7F7F5] p-4 text-base text-[#141414] placeholder:text-[#9A9A97] focus:border-[#0077B6] focus:outline-none"
          rows={4}
        />
        <SubmitButton
          onClick={() => onSubmit(textValue)}
          disabled={!textValue.trim()}
        >
          Submit
        </SubmitButton>
      </div>
    );
  }

  if (type === "auth") {
    return (
      <div className="flex flex-col items-center gap-6 rounded-2xl bg-white p-8 shadow-[0_4px_60px_rgba(0,0,0,0.06)]">
        <h2 className="text-center text-xl font-bold text-[#141414]">
          {prompt}
        </h2>
        <p className="max-w-md text-center text-base leading-relaxed text-[#4A4A48]">
          Please log in using the browser on the left side of the screen. When
          you are done, click the button below.
        </p>
        <SubmitButton onClick={() => onSubmit("User completed authentication")}>
          I&apos;m Done Logging In
        </SubmitButton>
      </div>
    );
  }

  return null;
}

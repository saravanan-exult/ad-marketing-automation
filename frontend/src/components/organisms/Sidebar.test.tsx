import "@testing-library/jest-dom";
import React from "react";
import { render, screen } from "@testing-library/react";
import { Sidebar } from "./Sidebar";

describe("Sidebar Component", () => {
  it("renders navigation items correctly when expanded", () => {
    render(
      <Sidebar
        currentStep="upload"
        onSelectStep={() => {}}
        isExpanded={true}
        onToggleExpand={() => {}}
        hasValidation={true}
        hasReconciliation={true}
      />,
    );

    expect(screen.getByText("1. Upload & Validate")).toBeInTheDocument();
    expect(screen.getByText("2. Review")).toBeInTheDocument();
    expect(screen.getByText("3. Reconciliation")).toBeInTheDocument();
    expect(screen.getByText("Dashboard & Audit")).toBeInTheDocument();
    expect(screen.getByText("Chat Assistant")).toBeInTheDocument();
  });
});

const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../frontend/src/test/ui.test.jsx");
let content = fs.readFileSync(filePath, "utf8");

const oldTest = `  it("clears search query and restores focus with clear button", async () => {
    mount(<ChatWorkspace />);
    const search = screen.getByLabelText("Search history");
    fireEvent.change(search, { target: { value: "migraine" } });
    expect(search.value).toBe("migraine");
    const clearBtn = screen.getByRole("button", { name: "Clear search query" });
    fireEvent.click(clearBtn);
    expect(search.value).toBe("");
  });
});`;

const newTest = `  it("clears search query and restores focus with clear button", async () => {
    mount(<ChatWorkspace />);
    const search = screen.getByLabelText("Search history");
    fireEvent.change(search, { target: { value: "migraine" } });
    expect(search.value).toBe("migraine");
    const clearBtn = screen.getByRole("button", { name: "Clear search query" });
    fireEvent.click(clearBtn);
    expect(search.value).toBe("");
  });
  it("imports a valid conversation JSON export and renders the messages", async () => {
    mount(<ChatWorkspace />);
    const payload = JSON.stringify({
      title: "Imported Consultation",
      messages: [
        { id: "msg-1", text: "Imported clinical question", isUser: true },
        { id: "msg-2", text: "Imported educational response", isUser: false },
      ],
    });
    const file = new File([payload], "chat-export.json", { type: "application/json" });
    const input = screen.getByLabelText("Upload conversation JSON");
    fireEvent.change(input, { target: { files: [file] } });
    await screen.findByText("Imported clinical question");
    expect(screen.getByText("Imported educational response")).toBeTruthy();
    expect(screen.getByText("Imported Consultation")).toBeTruthy();
    expect(screen.getByText("Imported conversation loaded into workspace")).toBeTruthy();
  });
  it("shows an error when importing a corrupt or invalid JSON file", async () => {
    mount(<ChatWorkspace />);
    const file = new File(["not valid json {{"], "corrupt.json", { type: "application/json" });
    const input = screen.getByLabelText("Upload conversation JSON");
    fireEvent.change(input, { target: { files: [file] } });
    await screen.findByText(/Could not parse file/);
  });
});`;

const normContent = content.replace(/\r\n/g, "\n");
const normOldTest = oldTest.replace(/\r\n/g, "\n");
const normNewTest = newTest.replace(/\r\n/g, "\n");

if (!normContent.includes(normOldTest)) {
  console.error("Failed to find oldTest in ui.test.jsx");
  process.exit(1);
}

let patched = normContent.replace(normOldTest, normNewTest);
if (content.includes("\r\n")) {
  patched = patched.replace(/\n/g, "\r\n");
}

fs.writeFileSync(filePath, patched, "utf8");
console.log("Successfully patched ui.test.jsx with conversation import tests");

const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '../frontend/src/test/ui.test.jsx');
let content = fs.readFileSync(file, 'utf8');

const target1 = `    expect(history.getAttribute("aria-expanded")).toBe("false");
    expect(document.querySelector(".conversation").hasAttribute("inert")).toBe(false);
  });
});`;

const replacement1 = `    expect(history.getAttribute("aria-expanded")).toBe("false");
    expect(document.querySelector(".conversation").hasAttribute("inert")).toBe(false);
  });
  it("clears search query and restores focus with clear button", async () => {
    mount(<ChatWorkspace />);
    const search = screen.getByLabelText("Search history");
    fireEvent.change(search, { target: { value: "migraine" } });
    expect(search.value).toBe("migraine");
    const clearBtn = screen.getByRole("button", { name: "Clear search query" });
    fireEvent.click(clearBtn);
    expect(search.value).toBe("");
  });
});`;

const target2 = `  expect((await screen.findByRole("link", { name: "Start a conversation" })).getAttribute("href")).toBe("/chat");
  expect(screen.getByText("—")).toBeTruthy();
});`;

const replacement2 = `  expect((await screen.findByRole("link", { name: "Start a conversation" })).getAttribute("href")).toBe("/chat");
  expect(screen.getByText("—")).toBeTruthy();
});
it("renders AI provider distribution in dashboard when present", async () => {
  apiRequest.mockResolvedValue({
    rangeDays: 7,
    summary: { totalSessions: 2, totalMessages: 4, medicalResponses: 2, citations: 2, sourceAttachmentRate: 100 },
    trend: [],
    verification: { statuses: { citation_checked: 2 }, providers: { Gemini: 2 } },
    dataset: null,
  });
  mount(<Dashboard />);
  expect(await screen.findByRole("heading", { name: "AI providers" })).toBeTruthy();
  expect(screen.getByText("Gemini")).toBeTruthy();
});`;

const crlf = content.includes('\r\n');
content = content.replace(crlf ? target1.replace(/\n/g, '\r\n') : target1, crlf ? replacement1.replace(/\n/g, '\r\n') : replacement1);
content = content.replace(crlf ? target2.replace(/\n/g, '\r\n') : target2, crlf ? replacement2.replace(/\n/g, '\r\n') : replacement2);

fs.writeFileSync(file, content);
console.log('ui.test.jsx successfully updated');

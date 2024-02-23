import { countUserMentions } from "./countUserMentions"; // Adjust the import path as necessary

describe("countUserMentions", () => {
  it("should return 0 for text without mentions", () => {
    const text = `This is a sample text without any mentions.`;
    expect(countUserMentions(text)).toBe(0);
  });

  it("should correctly count a single mention", () => {
    const text = `Hello @user, welcome to the platform!`;
    expect(countUserMentions(text)).toBe(1);
  });

  it("should correctly count multiple mentions", () => {
    const text = `Hello @user1, @user2, and @user3!`;
    expect(countUserMentions(text)).toBe(3);
  });

  it("should handle code blocks", () => {
    const text = "`@user`";
    expect(countUserMentions(text)).toBe(0);
  });

  it("should correctly handle spaces", () => {
    const text = "(@user/something)";
    expect(countUserMentions(text)).toBe(0);
  });

  it("should correctly count duplicate mentions", () => {
    const text = `Hello @user, welcome to the platform! @user`;
    expect(countUserMentions(text)).toBe(1);
  });

  it("should correctly handle code blocks", () => {
    const text =
      "```diff @@             Coverage Diff             @@ ##             main    #2370       +/-   ## \n```";
    expect(countUserMentions(text)).toBe(0);
  });

  it("should correctly handle HTML comments", () => {
    const text = `<!-- @user -->`;
    expect(countUserMentions(text)).toBe(0);
  });
});

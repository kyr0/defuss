import { $ } from "./dequery.js";

const mockFormHTML = `
<form id="testForm">
  <input type="text" name="name" value="John Doe">
  <input type="email" name="email" value="john@example.com">
  <input type="checkbox" name="subscribe" value="newsletter" checked>
  <input type="checkbox" name="terms" value="agreed" checked>
  <input type="checkbox" name="ads" checked>
  <input type="checkbox" name="options" value="option1" checked>
  <input type="checkbox" name="options" value="option2">
  <input type="checkbox" name="options" value="option3" checked>
  <input type="radio" name="gender" value="male" checked>
  <input type="radio" name="gender" value="female">
  <input type="radio" name="test" checked>
  <select name="country">
    <option value="us" selected>United States</option>
    <option value="ca">Canada</option>
    <option value="uk">United Kingdom</option>
  </select>
  <select name="interests" multiple>
    <option value="sports" selected>Sports</option>
    <option value="movies">Movies</option>
    <option value="music" selected>Music</option>
  </select>
  <textarea name="message">Hello, world!</textarea>
</form>
`;

// Setup mock DOM
beforeEach(() => {
  document.body.innerHTML = mockFormHTML;
});

describe("Tests for serialization and deserialization", () => {
  it("gets all form values correctly", async () => {
    const formData = await $("#testForm").form();
    expect(formData).toEqual({
      name: "John Doe",
      email: "john@example.com",
      subscribe: "newsletter",
      terms: "agreed",
      ads: true,
      test: true,
      options: ["option1", "option3"],
      gender: "male",
      country: "us",
      interests: ["sports", "music"],
      message: "Hello, world!",
    });
  });

  it("serializes form values into query string", async () => {
    const querystring = await $("#testForm").serialize();

    expect(querystring).toContain("name=John+Doe");
    expect(querystring).toContain("email=john%40example.com");
    expect(querystring).toContain("subscribe=newsletter");
    expect(querystring).toContain("terms=agreed");
    expect(querystring).toContain("options=option1");
    expect(querystring).toContain("options=option3");
    expect(querystring).not.toContain("options=option2");
    expect(querystring).toContain("gender=male");
    expect(querystring).toContain("test=on");
    expect(querystring).not.toContain("gender=female");
    expect(querystring).toContain("country=us");
    expect(querystring).toContain("interests=sports");
    expect(querystring).toContain("interests=music");
    expect(querystring).not.toContain("interests=movies");
    expect(querystring).toContain("message=Hello%2C+world%21");
  });

  it("serializes form values into JSON", async () => {
    const json = await $("#testForm").serialize("json");
    const data = JSON.parse(json);

    expect(data.name).toBe("John Doe");
    expect(data.email).toBe("john@example.com");
    expect(data.subscribe).toBe("newsletter");
    expect(data.terms).toBe("agreed");
    expect(Array.isArray(data.options)).toBeTruthy();
    expect(data.options).toContain("option1");
    expect(data.options).toContain("option3");
    expect(data.options).not.toContain("option2");
    expect(data.gender).toBe("male");
    expect(data.country).toBe("us");
    expect(Array.isArray(data.interests)).toBeTruthy();
    expect(data.interests).toContain("sports");
    expect(data.interests).toContain("music");
    expect(data.interests).not.toContain("movies");
    expect(data.message).toBe("Hello, world!");
  });
});

import { describe, it, expect } from "vitest";
import { pickBestImage, scoreTitle, type CommonsPage } from "./genusImage";

const page = (title: string, index = 1): CommonsPage => ({ title: `File:${title}`, index, imageinfo: [{ thumburl: `t/${title}`, url: `o/${title}`, descriptionurl: `d/${title}` }] });
const pick = (genus: string, titles: string[]) => pickBestImage(titles.map((t, i) => page(t, i + 1)), genus)?.title.replace("File:", "") ?? null;

// Titles below are real Commons search results (2026-11-22).
describe("pickBestImage (real Commons titles)", () => {
  it("Huayangosaurus: prefers the artwork PNG over skulls, scale charts and museum photos", () => {
    expect(
      pick("Huayangosaurus", [
        "Huayangosaurus Silhouette.png", "Huayangosaurus taibaii 20050707 07.jpg", "Huayangosaurus BW.jpg", "Huayangosaurus Scale.svg",
        "Huayangosaurus taibaii.png", "Huayangosaurus taibaii Multiview Skeletal.png", "Huayangosaurus taibaii fossil.jpg",
        "Zigong Dinosaur Museum Huayangosaurus skull.jpg", "Huayangosaurus taibaii.jpg",
      ])
    ).toBe("Huayangosaurus taibaii.png");
  });
  it("Parasaurolophus: the life reconstruction wins over photos of expo models and fossils", () => {
    expect(
      pick("Parasaurolophus", [
        "Parasaurolophus cyrtocristatus.jpg", "FMNH Parasaurolophus fossil.jpg", "Parasaurolophus, Expo Dinosaurios 2023 - A740983.jpg",
        "Life reconstruction of Parasaurolophus walkeri.png", "Parasaurolophus walkeri.png", "Parasaurolophus skulls.jpg",
      ])
    ).toBe("Life reconstruction of Parasaurolophus walkeri.png");
  });
  it("Stegosaurus: keeps a life restoration, drops a historical plate figure", () => {
    expect(pick("Stegosaurus", ["Stegosaurus reconstruction, from Abel, O. (1919).jpg", "Stegosaurus stenops Life Reconstruction.png"])).toBe("Stegosaurus stenops Life Reconstruction.png");
  });
  it("Euoplocephalus: accepts a digital reconstruction, rejects a schematic of the jaw", () => {
    expect(pick("Euoplocephalus", ["Schematic illustrations of the mandibular region of Euoplocephalus tutus.jpg", "Euoplocephalus digital clay reconstruction.png"])).toBe("Euoplocephalus digital clay reconstruction.png");
  });
});

describe("rejections", () => {
  it("ignores files about another genus", () => {
    expect(scoreTitle("File:Alioramus Life Restoration.jpg", "Ceratosaurus")).toBe(-1);
  });
  it("returns null rather than a fossil when nothing qualifies", () => {
    expect(pick("Telmatosaurus", ["Telmatosaurus skull.jpg", "Telmatosaurus fossil.jpg", "Telmatosaurus.jpg"])).toBeNull();
  });
  it("skips vector, pdf and entries without a usable URL", () => {
    expect(pickBestImage([{ title: "File:Ceratosaurus life restoration.svg", imageinfo: [{ thumburl: "t", url: "u" }] }, { title: "File:Ceratosaurus life restoration.png" }], "Ceratosaurus")).toBeNull();
  });
});

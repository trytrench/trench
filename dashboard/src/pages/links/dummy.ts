import type { EntityData, Link } from "./types";

// dummy data below //

const userInQuestion: EntityData = {
  id: "AAAAA",
  type: "Email",
  name: "natalie.fernandez@bluewave.io",
};

// THESE ARE NOT REPRESENTATIVE OF THE DATABASE SCHEMA
const userLabels = [
  {
    value: "Multiple Fraud Alerts",
    color: "red",
  },
  {
    value: "Used ≥4 cards",
    color: "yellow",
  },
];

const left: EntityData[] = [
  {
    id: "devId",
    type: "DeviceId",
    name: "Chrome - Windows",
  },
  {
    id: "devFp",
    type: "Device Fingerprint",
    name: "fad5ece87b3563b6aadde29ba4a1c5f7",
  },
  {
    id: "ip",
    type: "Ip Address",
    name: "69.50.33.251",
  },
  {
    id: "c1",
    type: "Card",
    name: "Mastercard 3347",
  },
  {
    id: "c2",
    type: "Card",
    name: "American Express 4849",
  },
  {
    id: "c3",
    type: "Card",
    name: "Visa 3144",
  },
  {
    id: "c4",
    type: "Card",
    name: "Visa 6532",
  },
  {
    id: "c5",
    type: "Card",
    name: "Visa 3133",
  },
  {
    id: "loc",
    type: "Location",
    name: "London, UK",
  },
];

// just emails
const right: EntityData[] = [
  "natalief@hotmail.com",
  "mikealder99@hotmail.com",
  "bdavi.@gmx.de",
  "sophia.martinez82@example.com",
  "bryan.j.thompson@techworld.net",
  "chrwin@icloud.com",
  "rwelty@aol.com",
  "pemungkah@verizon.net",
  "cyrus@icloud.com",
  "cliffski@optonline.net",
  "tlinden@comcast.net",
  "connor_jones@worldtalk.net",
].map((email, index) => ({
  id: `right-${index}`,
  type: "Digit-normalized Email",
  name: email,
}));

const links: Link[] = [
  {
    from: "devId",
    to: "right-0",
  },
  {
    from: "devFp",
    to: "right-0",
  },
  {
    from: "ip",
    to: "right-0",
  },
  {
    from: "c2",
    to: "right-0",
  },
  {
    from: "loc",
    to: "right-0",
  },
  {
    from: "c3",
    to: "right-4",
  },
  {
    from: "c4",
    to: "right-6",
  },
  {
    from: "c5",
    to: "right-5",
  },
  {
    from: "c4",
    to: "right-3",
  },
  ...[1, 2, 3, 4, 5].map((i) => ({
    from: `ip`,
    to: `right-${i}`,
  })),
  ...[1, 2, 3, 4, 5].map((i) => ({
    from: `loc`,
    to: `right-${i}`,
  })),
  ...[1, 3, 4, 5, 6, 7, 8, 9].map((i) => ({
    from: `devFp`,
    to: `right-${i}`,
  })),
  ...[10, 11].map((i) => ({
    from: `devId`,
    to: `right-${i}`,
  })),
];

export {
  left as dummyLeft,
  right as dummyRight,
  links as dummyLinks,
  userInQuestion as dummyUser,
  userLabels as dummyUserLabels,
};

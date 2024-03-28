import Head from "next/head";
import Link from "next/link";
import { Panel } from "~/components/ui/custom/panel";
import { api } from "~/utils/api";
import { Navbar } from "../components/Navbar";

function Datasets() {
  return (
    <div className="p-8">
      <h1 className="text-lg text-emphasis-foreground">Datasets</h1>
      <div className="h-8"></div>
      <div className="flex flex-col gap-4"></div>
    </div>
  );
}

export default function Ai() {
  return (
    <>
      <Navbar />
    </>
  );
}

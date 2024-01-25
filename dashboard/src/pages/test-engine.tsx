import { api } from "../utils/api";
import React, { useEffect, useRef } from "react";

export default function Page() {
  const { data: eventTypes } = api.eventTypes.list.useQuery();
  return <div className=""></div>;
}

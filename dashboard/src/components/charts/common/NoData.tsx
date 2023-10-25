import React from "react";

interface NoDataProps {
  noDataText?: string;
}
const NoData = ({ noDataText = "No data" }: NoDataProps) => {
  return <div>{noDataText}</div>;
};

export default NoData;

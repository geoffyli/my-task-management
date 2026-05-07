import { TIME_RANGES, type TimeRange } from "@/lib/constants";
import { SegmentedControl } from "./SegmentedControl";

interface Props {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}

export function TimeRangeSelector({ value, onChange }: Props) {
  return <SegmentedControl options={TIME_RANGES} value={value} onChange={onChange} />;
}

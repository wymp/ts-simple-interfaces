import { SimpleLoggerConsole } from "../src/";
import { SimpleLoggerInterface } from "@wymp/ts-simple-interfaces";

const log: SimpleLoggerInterface = new SimpleLoggerConsole();

describe("SimpleLoggerConsole", () => {
  for (const level of [
    "debug",
    "info",
    "notice",
    "warning",
    "error",
    "critical",
    "alert",
    "emergency"
  ] as Array<keyof SimpleLoggerInterface>) {
    it(`should successfully log ${level} messages`, () => {
      expect(() => {
        return (log[level] as any)(`Testing ${level} messages`);
      }).not.toThrow();
    });
  }
});

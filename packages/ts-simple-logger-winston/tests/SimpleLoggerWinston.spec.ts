import { SimpleLoggerWinston } from "../src/";
import { SimpleLoggerInterface } from "@wymp/ts-simple-interfaces";
import * as winston from "winston";

const log: SimpleLoggerInterface = new SimpleLoggerWinston({
  transports: new winston.transports.Console()
});

describe("SimpleLoggerWinston", () => {
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

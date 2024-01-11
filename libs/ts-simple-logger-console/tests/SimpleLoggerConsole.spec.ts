import { SimpleLoggerConsole, Console } from "../src/";
import { SimpleLoggerInterface } from "@wymp/ts-simple-interfaces";

describe("SimpleLoggerConsole", () => {
  let _console: any;
  let log: SimpleLoggerInterface;

  beforeEach(() => {
    // Reset the mock console
    _console = {
      debug: jest.fn(),
      info: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    // Reset logger
    log = new SimpleLoggerConsole({ level: "debug" }, _console);
  });

  const ts = "[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]+Z";

  for (const level of ["debug", "info", "notice", "warning", "error", "critical", "alert", "emergency"] as Array<
    keyof SimpleLoggerInterface
  >) {
    it(`should successfully log ${level} messages`, () => {
      (log[level] as any)(`Testing ${level} messages`);

      const expectedLevel =
        level === "debug"
          ? "debug"
          : level === "info"
            ? "info"
            : level === "notice"
              ? "log"
              : level === "warning"
                ? "warn"
                : "error";

      expect(_console[expectedLevel].mock.calls).toHaveLength(1);
      expect(_console[expectedLevel].mock.calls[0][0]).toMatch(
        new RegExp(`^${ts} \\[${level}\\] Testing ${level} messages`),
      );
    });
  }
});

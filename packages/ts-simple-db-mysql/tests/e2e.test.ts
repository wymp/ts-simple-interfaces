import "jest";
import { SimpleDbMysql } from "../src";
import * as fs from "fs";

describe("End-To-End Tests", () => {
  describe("SimpleDbMysql", () => {
    let mysql: SimpleDbMysql;

    // Get config
    if (!fs.existsSync("./tests/config.json")) {
      throw new Error(
        `You must copy ./tests/config.example.json to ./tests/config.json and set the correct ` +
          `values.`
      );
    }
    const config = JSON.parse(fs.readFileSync("./tests/config.json", "utf8"));

    // Set up/Tear Down
    beforeEach(async () => {
      mysql = new SimpleDbMysql(config.db);
      await mysql.query(
        "CREATE TABLE `test` (`id` INT UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT, `name` VARCHAR(50) NULL)"
      );
    });
    afterEach(async () => {
      await mysql.query("DROP TABLE `test`");
      await mysql.close();
    });

    test("should return affected rows when executing mutation statements", async () => {
      const r = await mysql.query("INSERT INTO `test` (`id`) VALUES (NULL), (NULL)");
      expect(r).toHaveProperty("affectedRows");
      expect(r.affectedRows).toBe(2);
      expect(r).toHaveProperty("rows");
      expect(r.rows.length).toBe(0);

      const r2 = await mysql.query("UPDATE `test` SET `id` = 3 WHERE `id` = 1");
      expect(r2).toHaveProperty("affectedRows");
      expect(r2.affectedRows).toBe(1);
      expect(r2).toHaveProperty("rows");
      expect(r2.rows.length).toBe(0);
    });

    test("should return rows when executing select statements", async () => {
      await mysql.query("INSERT INTO `test` (`id`) VALUES (NULL), (NULL), (NULL), (NULL)");
      const r = await mysql.query<{ id: number }>("SELECT * FROM `test`");
      expect(r).not.toHaveProperty("affectedRows");
      expect(r).toHaveProperty("rows");
      expect(r.rows.length).toBe(4);
      expect(r.rows[0].id).toBe(1);
      expect(r.rows[1].id).toBe(2);

      const r2 = await mysql.query<{ id: number }>("SELECT * FROM `test` WHERE `id` > 2");
      expect(r2).not.toHaveProperty("affectedRows");
      expect(r2).toHaveProperty("rows");
      expect(r2.rows.length).toBe(2);
      expect(r2.rows[0].id).toBe(3);
      expect(r2.rows[1].id).toBe(4);
    });

    test("should correctly handle multiple inserts", async () => {
      const r1 = await mysql.query("INSERT INTO `test` VALUES ?", [
        [
          [1, "fred"],
          [2, "barney"],
          [10, "wilma"],
          [11, "maude"],
          [20, "linny"],
        ],
      ]);

      expect(r1).toHaveProperty("affectedRows");
      expect(r1.affectedRows).toBe(5);
      expect(r1.rows).toHaveLength(0);

      const r2 = await mysql.query<{ id: string }>("SELECT * FROM `test`");
      expect(r2.rows).toHaveLength(5);
      expect(r2.rows[0].id).toBe(1);
      expect(r2.rows[1].id).toBe(2);
      expect(r2.rows[2].id).toBe(10);
      expect(r2.rows[3].id).toBe(11);
      expect(r2.rows[4].id).toBe(20);
    });
  });
});

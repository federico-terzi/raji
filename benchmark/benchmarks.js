const b = require("benny");
const raji = require("./loadRaji");
console.log(raji);

const generateBigJsonList = () => {
  const obj = [];

  for (let i = 0; i < 10000; i++) {
    obj.push({
      name: i.toString(),
      val: i,
    });
  }

  return JSON.stringify(obj);
};

b.suite(
  "JSON parsing performance (big json list)",

  b.add("raji.parse (default configs)", async () => {
    const json = generateBigJsonList();

    return async () => {
      await raji.parse(json);
    };
  }),

  b.add("reference JSON.parse", async () => {
    const json = generateBigJsonList();

    return async () => {
      JSON.parse(json);
    };
  }),

  // TODO: create version without optimizations

  b.cycle(),
  b.complete(),
  b.save({ file: "big_json_list", format: "chart.html" })
);

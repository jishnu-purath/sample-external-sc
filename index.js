const grpc = require("grpc");
const request = require("request");
const externalScalerProto = grpc.load("externalscaler.proto");

const url = process.env.URL || "localhost://";

const server = new grpc.Server();

server.addService(externalScalerProto.externalscaler.ExternalScaler.service, {
  isActive: (call, callback) => {
    console.log("Is Active");
    getStatus((err, resp, data) => {
      if (err) {
        console.error("Error calling service", err);
        callback({
          code: grpc.status.INTERNAL,
          details: err,
        });
      } else if (resp.statusCode !== 200) {
        console.error("Non success status code", resp);
        callback({
          code: grpc.status.INTERNAL,
          details: `expected status 200, got ${resp.statusCode}`,
        });
      } else {
        console.error("Success", data);
        const { isActive } = data;
        callback(null, {
          result: isActive,
        });
      }
    });
  },
  streamIsActive: (call, callback) => {
    console.log("streamIsActive");
    const interval = setInterval(() => {
      console.log("Checking status");
      getStatus((err, resp, data) => {
        if (err || resp.statusCode !== 200) {
          console.error("Error checking status", err);
        } else if (data.isActive) {
          console.log("Successfully called", data);
          call.write({
            result: true,
          });
        }
      });
    }, 1000 * 60 * 60);

    call.on("end", () => {
      console.log("Successfully called");
      clearInterval(interval);
    });
  },

  getMetricSpec: (call, callback) => {
    console.log("getMetricSpec");
    callback(null, {
      metricSpecs: [
        {
          metricName: "earthquakeThreshold",
          targetSize: 10,
        },
      ],
    });
  },
  getMetrics: (call, callback) => {
    console.log("getMetrics");
    getStatus((err, resp, data) => {
      if (err || resp.statusCode !== 200) {
        console.error("Error checking status", err);
        callback({
          code: grpc.status.INTERNAL,
          details: err,
        });
      } else {
        console.log("Success, getMetrics", data);
        const { count } = data;
        callback(null, {
          metricValues: [
            {
              metricName: "earthquakeThreshold",
              metricValue: count,
            },
          ],
        });
      }
    });
  },
});

const getStatus = (callback) => {
  console.log("Get status from " + url);
  request.get(
    {
      url: url,
      json: true,
    },
    (err, resp, data) => {
      callback(err, resp, data);
    }
  );
};

const port = process.env.PORT || "0.0.0.0:9090";

server.bind(port, grpc.ServerCredentials.createInsecure());

console.log(`Server listening on ${port}`);

server.start();

const oracledb = require("oracledb");
const express = require("express");
const app = express();

const username = process.env.username || "<your_user_name>";
const password = process.env.password || "<your_oracle_password>";
const dbuser = process.env.dbuser || "manika.";
var bodyParser = require("body-parser");

const {
  generateQuery,
  generateTwoCityJoinWithSameAttributes
} = require("./dgFunctions");

// Add headers
app.use(function(req, res, next) {
  // Website you wish to allow to connect
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3001");

  // Request methods you wish to allow
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );

  // Request headers you wish to allow
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With,content-type"
  );

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader("Access-Control-Allow-Credentials", true);

  // Pass to next layer of middleware
  next();
});

app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(
  bodyParser.urlencoded({
    // to support URL-encoded bodies
    extended: true
  })
);

queryExecuteWithOracle = (query, params, applyFunction) => {
  let pool = oracledb.getPool();
  return pool
    .getConnection()
    .then(conn => {
      return conn
        .execute(query, params)
        .then(response => response.rows)
        .then(response => applyFunction(response))
        .then(response => {
          conn.close().catch(err => {
            console.error("execute() error release() error", err);
            return {
              error: err,
              type: "Some kind of problem with connection closure"
            };
          });
          return response;
        })
        .catch(err => {
          conn.close().catch(err => {
            console.error("execute() error release() error", err);
            return {
              error: err,
              type: "Some kind of problem with connection closure"
            };
          });
          console.log(err);
          return {
            error: err,
            type: "Some kind of problem with query string"
          };
        });
    })
    .catch(err => {
      console.log(err);
      return {
        error: err,
        type: "Some kind of error occured with connection pooling"
      };
    });
};

transform = result => {
  new_result = result.map(re => {
    return {
      cityName: re[0],
      state: re[1],
      latitude: re[3],
      longitude: re[4],
      region: re[5]
    };
  });

  return new_result;
};

app.get("/test", (req, res) => {
  queryExecuteWithOracle(`select * from ${dbuser}city`, [], transform)
    .then(result => {
      res.send({
        result: result
      });
    })
    .catch(err => {
      res.send({
        error: "Some error with the connection setup"
      });
    });
});

transformToCityJson = result => {
  console.log(result);
  return result;
};

app.get("/get-cities", (req, res) => {
  queryExecuteWithOracle(`select * from ${dbuser}city`, [], transform)
    .then(result => {
      res.send({
        result: result
      });
    })
    .catch(err => {
      res.send({
        error: "Some error with the connection setup."
      });
    });
});

app.post("/get-city-description", (req, res) => {
  console.log("Ye bhais aab", req.body);
  res.send({
    ye: "helo"
  });
});

passResults = results => results;

transformSearchQueryResults = results => {
  if (results.length === 0) {
    return {
      error: "No data found !"
    };
  }

  let title, yAxisName, xAxisName, unit, seriesTitle;

  let data = [];

  title = results[0][0];
  unit = results[0][9];

  yAxisName = `${title} ( ${unit} )`;
  seriesTitle = `${title} for the range specified Range`;

  data = results.map(value => {
    var d = new Date(value[1]);
    return [
      Date.UTC(d.getFullYear(), d.getUTCMonth(), d.getUTCDate()),
      value[8]
    ];
  });
  console.log(data);
  return {
    title: title,
    data: data,
    xAxisName: "Year",
    yAxisName: yAxisName,
    unit: unit
  };
};


app.post("/get-search-results", (req, res) => {
  console.log("Ye bhais aab", req.body.entities);

  if ("entities" in req.body) {
    let entities = req.body.entities;
    let cityNames = [],
      regionNames = [],
      weatherAspects = [];
    (dates = []), (tables = []);
    if ("city_name" in entities) {
      entities.city_name.forEach(city => {
        cityNames.push(city.value);
      });
    }

    if ("weather_aspect" in entities) {
      entities.weather_aspect.forEach(a => {
        weatherAspects.push(a.value);
      });
    }

    if ("datetime" in entities) {
      entities.datetime.forEach(v => {
        if ("from" in v) {
          console.log("go there");
          dates.push(v.from.value, v.to.value);
        } else {
          dates.push(v.value);
        }
      });
    }

    if (cityNames.length === 2) {
      let { query, queryArguments, graphtype } = generateTwoCityJoinWithSameAttributes(
        cityNames,
        regionNames,
        weatherAspects,
        dates,
        tables
      );
      console.log(queryArguments, query);

      queryExecuteWithOracle(query, queryArguments, passResults)
        .then(result => {
          console.log(result);
          let makeResponse = transformTwoCityResult(result);
          res.send({
            result: makeResponse,
            graphtype: graphtype
          });
        })
        .catch(err => {
          res.send({
            error: "Some error with the connection setup."
          });
        });

    } else if (weatherAspects.length === 2) {
    } else {
      let { query, queryArguments, graphtype } = generateQuery(
        cityNames,
        regionNames,
        weatherAspects,
        dates,
        tables
      );
      console.log(queryArguments);

      queryExecuteWithOracle(query, queryArguments, passResults)
        .then(result => {
          let makeResponse = transformSearchQueryResults(result);
          res.send({
            result: makeResponse,
            graphtype: graphtype
          });
        })
        .catch(err => {
          res.send({
            error: "Some error with the connection setup."
          });
        });
    }
  } else {
  }
});

transformTwoCityResult = (results) => {

  return results;
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  oracledb
    .createPool({
      poolMax: 64,
      user: username,
      password: password,
      connectString: "oracle.cise.ufl.edu:1521/orcl"
    })
    .then(() => {
      console.log("established pool");
      console.log("Starting server on ..... " + PORT);
    });
});

process.on("SIGINT", () => {
  log.info("releasing Oracle pool");
  poolP.then(pool => BP.fromNode(cb => pool.terminate(cb))).then(
    () => process.exit(0),
    e => {
      throw e;
    }
  );
});

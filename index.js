const oracledb = require("oracledb");
const express = require("express");
const app = express();
oracledb.autoCommit = true

const username = process.env.username || "<your_user_name>";
const password = process.env.password || "<your_oracle_password>";
const dbuser = process.env.dbuser || "manika.";
var bodyParser = require("body-parser");

const {
  generateQuery,
  generateTwoCityJoinWithSameAttributes,
  generateSameCityTwoAttributes
} = require("./dgFunctions");

// Add headers
app.use(function(req, res, next) {
  // Website you wish to allow to connect
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");

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


app.post("/test1", (req, res) => {

  const query = `select * from ((select LAST_DAY(TO_DATE(x || y || '-01', 'YYYY-MM-DD')) as w_date, city_name, s1, pn1, mv1, mh1, aqi1 from (select to_char(po_date, 'yyyy') as x, to_char(po_date, 'mm') as y, city_name as city_name, symbol as s1, pollutant_name as pn1, avg(mean_value) as mv1, max(max_value) as mx1, avg(max_hour) as mh1, avg(aqi) as aqi1 from manika.city NATURAL JOIN MANIKA.IS_POLLUTED_BY NATURAL JOIN MANIKA.POLLUTANT where city_name=:city1 and symbol = 'NO2' and pollutant_name = 'Nitrogen Dioxide' group by to_char(po_date, 'yyyy'), to_char(po_date, 'mm'), city_name, symbol, pollutant_name order by to_char(po_date, 'yyyy'))) NATURAL JOIN (select LAST_DAY(TO_DATE(x || y || '-01', 'YYYY-MM-DD')) as w_date, city_name, s2, pn2, mv2, mh2, aqi2 from (select to_char(po_date, 'yyyy') as x, to_char(po_date, 'mm') as y, city_name as city_name, symbol as s2, pollutant_name as pn2, avg(mean_value) as mv2, max(max_value) as mx2, avg(max_hour) as mh2, avg(aqi) as aqi2 from manika.city NATURAL JOIN MANIKA.IS_POLLUTED_BY NATURAL JOIN MANIKA.POLLUTANT where city_name=:city2 and symbol = 'SO2' and pollutant_name = 'Sulfur Dioxide' group by to_char(po_date, 'yyyy'), to_char(po_date, 'mm'), city_name, symbol, pollutant_name order by to_char(po_date, 'yyyy'))) NATURAL JOIN (select LAST_DAY(TO_DATE(x || y || '-01', 'YYYY-MM-DD')) as w_date, city_name, s3, pn3, mv3, mh3, aqi3 from (select to_char(po_date, 'yyyy') as x, to_char(po_date, 'mm') as y, city_name as city_name, symbol as s3, pollutant_name as pn3, avg(mean_value) as mv3, max(max_value) as mx3, avg(max_hour) as mh3, avg(aqi) as aqi3 from manika.city NATURAL JOIN MANIKA.IS_POLLUTED_BY NATURAL JOIN MANIKA.POLLUTANT where city_name=:city3 and symbol = 'O3' and pollutant_name = 'Ozone' group by to_char(po_date, 'yyyy'), to_char(po_date, 'mm'), city_name, symbol, pollutant_name order by to_char(po_date, 'yyyy'))) NATURAL JOIN (select LAST_DAY(TO_DATE(x || y || '-01', 'YYYY-MM-DD')) as w_date, city_name, s4, pn4, mv4, mh4, aqi4 from (select to_char(po_date, 'yyyy') as x, to_char(po_date, 'mm') as y, city_name as city_name, symbol as s4, pollutant_name as pn4, avg(mean_value) as mv4, max(max_value) as mx4, avg(max_hour) as mh4, avg(aqi) as aqi4 from manika.city NATURAL JOIN MANIKA.IS_POLLUTED_BY NATURAL JOIN MANIKA.POLLUTANT where city_name=:city4 and symbol = 'CO' and pollutant_name = 'Carbon Monoxide' group by to_char(po_date, 'yyyy'), to_char(po_date, 'mm'), city_name, symbol, pollutant_name order by to_char(po_date, 'yyyy')))) WHERE w_date BETWEEN TO_DATE (:d1, 'mm/dd/yyyy') AND TO_DATE (:d2, 'mm/dd/yyyy')`
  queryExecuteWithOracle(query, ['New York', 'New York','New York','New York', '02/28/2014', '02/28/2014'], transform)
    .then(result => {
      console.log(result)
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
  res.send({
    ye: "helo"
  });
});

passResults = results => results;

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

      let { query, queryArguments, graphtype } = generateSameCityTwoAttributes(
        cityNames,
        regionNames,
        weatherAspects,
        dates,
        tables
      );
      console.log(queryArguments, query);

      queryExecuteWithOracle(query, queryArguments, passResults)
        .then(result => {
          console.log(result.slice(1,5));
          let makeResponse = transformTwoAttributes(result);
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

handleTableFormat = (table, result) => {
  
  if (table === 'City' || table === 'city') {
    let headers = ['City', 'State', 'County', 'Latitude', 'Longitude', 'Region']
    let sequence = ['city_name', 'state', 'county', 'latitude', 'longitude', 'region_name']
    let primaryFields = ['city_name', 'state']

    let finalResults = result.map(city => {
      return {
        'city_name': city[0],
        'state': city[1],
        'county': city[2],
        'latitude': city[3],
        'longitude': city[4],
        'region_name': city[5]
      }
    })
    //console.log(finalResults)
    return {
      "data": finalResults,
      "headers": headers,
      "primary": primaryFields,
      "sequence": sequence
    }

  } else if (table === 'Population' || table === 'population') {
    console.log('got here')
    let headers = ['City', 'State', 'TimeStamp', 'Size']
    let sequence = ['city_name', 'state', 'p_year', 'p_size']
    let primaryFields = ['city_name', 'state', 'p_year']

    let finalResults = result.map(city => {
      console.log(city[2], new Date(city[2]))
      let d = new Date(city[2])
      return {
        'city_name': city[0],
        'state': city[1],
        'p_year': d.getFullYear() + "-" + d.getUTCMonth() + "-" + d.getUTCDate(),
        'p_size': city[3],
        'orignal': city[2]
      }
    })

    finalResults = finalResults.sort(function(a, b) {
      return a['orignal'] - b['orignal']
    })

    return {
      "data": finalResults,
      "headers": headers,
      "primary": primaryFields,
      "sequence": sequence
    }
  } else if (table === 'is_affected_by' || table === 'Is_affected_by') {

    result = result.slice(0, 500);
    let headers = ['Metric Value', 'City Name', 'State', 'Aspect', 'TimeStamp']
    let sequence = ['metric_value', 'city_name', 'state', 'aspect', 'w_date']
    let primaryFields = ['city_name', 'state']

    let finalResults = result.map(city => {
      console.log(city[2], new Date(city[2]))
      let d = new Date(city[4])
      return {
        'metric_value': city[0],
        'city_name': city[1],
        'state': city[2],
        'aspect': city[3],
        'w_date': d.getFullYear() + "-" + d.getUTCMonth() + "-" + d.getUTCDate(),
        'orignal': d
      }
    })

    finalResults = finalResults.sort(function(a, b) {
      return a['orignal'] - b['orignal']
    })

    return {
      "data": finalResults,
      "headers": headers,
      "primary": primaryFields,
      "sequence": sequence
    }
  } else if (table === 'is_polluted_by') {
    result = result.slice(0, 500);
    let headers = ['Symbol', 'Date', 'City Name', 'State', 'Mean Value', 'Max Value', 'Max Hour', 'AQI']
    let sequence = ['symbol', 'po_date', 'city_name', 'state', 'mean_value', 'max_value', 'max_hour', 'aqi']
    let primaryFields = ['city_name', 'state']

    let finalResults = result.map(city => {
      console.log(city[2], new Date(city[2]))
      let d = new Date(city[1])
      return {
        'symbol': city[0],
        'po_date': d.getFullYear() + "-" + d.getUTCMonth() + "-" + d.getUTCDate(),
        'city_name': city[2],
        'state': city[3],
        'mean_value': city[4],
        'max_value': city[5],
        'max_hour': city[6],
        'aqi': city[7],
        'orignal': d
      }
    })

    finalResults = finalResults.sort(function(a, b) {
      return a['orignal'] - b['orignal']
    })

    return {
      "data": finalResults,
      "headers": headers,
      "primary": primaryFields,
      "sequence": sequence
    }
  }
  return result;
}


app.post('/get-table', (req, res) => {
  if ('table' in req.body) {
    const table = req.body.table
    queryExecuteWithOracle(`select * from ${dbuser}${table}`, [], passResults)
    .then(result => {
      const finalResults = handleTableFormat(table, result);
      res.send({
        result: finalResults
      });
    })
    .catch(err => {
      res.send({
        error: "Some error with the connection setup."
      });
    });
  } else {
    res.send({
      error: "Some problem with api connection"
    })
  }

})

app.post('/add-city', (req, res) => {
  console.log(req.body, "Hi i am here")
  if ('params' in req.body) {
    const params = req.body.params;
    queryExecuteWithOracle(`insert into ${dbuser}city values (:city_name, :state, :county, :latitude, :longitude, :region_name)`, params, passResults)
    .then(result => {
      console.log(result, ' I am the query result')
      res.send({
        result: result
      });
    })
    .catch(err => {
      res.send({
        error: "Some error with the connection setup."
      });
    });
  } else {
    res.send({
      "ylo": "Hi man"
    })
  }
})


app.post('/update-is-affected', (req, res) => {

  if ('city_name' in req.body && 'orignal' in req.body && 'aspect' in req.body && 'metric_value' in req.body) {
    let city_name = req.body.city_name;
    let orignal = req.body.orignal;
    let aspect = req.body.aspect;
    let new_value = req.body.metric_value
    let d = new Date(orignal)
    d.setMonth(d.getMonth() + 1);
    let  = `${d.getMonth()}-${d.da()}-${d.getFullYear()}`;
    condensed_date = condensed_date.trim()
    console.log(condensed_date, new_value, "these are teh value")
    
    queryExecuteWithOracle(`update ${dbuser}is_affected_by set metric_value = :id1 where city_name = :id2 and aspect = :id3 and w_date = TO_DATE(:id4,'dd/mm/yy')`, 
    [Number(new_value), city_name, aspect, condensed_date], passResults)
    .then(results => {

      res.send({
        result: result
      });    
    }).catch(err => {
      res.send({
        error: "Some error with the connection setup."
      });
    });

  }
  
})


app.post('/add-row', (req, res) => {
  if ('table' in req.body && 'paramDict' in req.body && 'paramKeys' in req.body) {
    const table = req.body.table;
    const paramDict = req.body.paramDict;
    const paramKeys = req.body.paramKeys;
    let paramKeysQ = paramKeys.map(p => ":" + p);
    paramKeysQ = paramKeysQ.join(", ");
    console.log(paramDict, 'This is hte param dict')

    queryExecuteWithOracle(`insert into ${dbuser}${table} values (${paramKeysQ}) `, paramDict, passResults)
    .then(result => {
      console.log(result, ' I am the query result')
      res.send({
        result: result
      });
    })
    .catch(err => {
      res.send({
        error: "Some error with the connection setup."
      });
    });
  } else {
    res.send({
      "ylo": "Hi man"
    })
  }
});


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


/*
  Transformations for different queries. 
*/

transformTwoAttributes = results => {
  if (results.length === 0) {
    return {
      error: "No data found !"
    };
  }


  let title, yAxisName, xAxisName, att1, att1Unit, att2, att2Unit, cityName;

  // let data = [];
  console.log("yaha aa gya mein")

  att1 = results[0][2];
  att1Unit = results[0][3];
  att2 = results[0][5];
  att2Unit = results[0][6];
  cityName = results[0][0];

  yAxisName = `${att1} (${att1Unit}) and ${att2} (${att2Unit})`
  title = `${cityName} : ${att1} V/S ${att2}`
  console.log(results, 'ither')

  let attData1 = results.map(value => {
    var d = new Date(value[1]);
    return [
      Date.UTC(d.getFullYear(), d.getUTCMonth(), d.getUTCDate()),
      value[4]
    ];
  })

  console.log(attData1)
  let attData2 = results.map(value => {
    var d = new Date(value[1]);
    return [
      Date.UTC(d.getFullYear(), d.getUTCMonth(), d.getUTCDate()),
      value[7]
    ];
  })

console.log(title)
  let re =  {
    title: title,
    name1: `${att1} (${att1Unit})`,
    data1: attData1,
    name2: `${att2} (${att2Unit})`,
    data2: attData2,
    xAxisName: "Year",
    yAxisName: yAxisName,

  };

  console.log(re)
  return re;
}

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

transformTwoCityResult = (results) => {
  if (results.length === 0) {
    return {
      error: "No data found !"
    };
  }
  console.log(results)
  let title, 
      yAxisName, 
      xAxisName, 
      unit, 
      seriesTitle,
      cityName1,
      cityName2;

  // let data = [];

  unit = results[0][6];
  cityName1 = results[0][3];
  cityName2 = results[0][5];
  title = `${results[0][0]} Comparison between ${cityName1} and ${cityName2}`;
  yAxisName = `${results[0][0]} ( ${unit} )`;
  seriesTitle = `${title} for the range specified Range`;

  let city1Data = results.map(value => {
    let d = new Date(value[1]);
       return [
      Date.UTC(d.getFullYear(), d.getUTCMonth(), d.getUTCDate()),
      value[2]-5
    ];
  })
  let city2Data = results.map(value => {
    let d = new Date(value[1]);
       return [
      Date.UTC(d.getFullYear(), d.getUTCMonth(), d.getUTCDate()),
      value[4]
    ];
  })
  
  
  return {
    title: title,
    name1: cityName1,
    data1: city1Data,
    name2: cityName2,
    data2: city2Data,
    xAxisName: "Year",
    yAxisName: yAxisName,
    unit: unit,
  };
}


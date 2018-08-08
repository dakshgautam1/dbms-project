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
  res.setHeader("Access-Control-Allow-Origin", "*");

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

transformWeatherPageData = (results) => {
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

  unit = results[0][2];
  cityName1 = results[0][4];
  cityName2 = results[0][6];
  title = `${results[0][1]} Comparison between ${cityName1} and ${cityName2}`;
  yAxisName = `${results[0][1]} ( ${unit} )`;
  seriesTitle = `${title} for the range specified Range`;

  let city1Data = results.map(value => {
    let d = new Date(value[0]);
       return [
      Date.UTC(d.getFullYear(), d.getUTCMonth(), d.getUTCDate()),
      value[3]
    ];
  })

  let city2Data = results.map(value => {
    let d = new Date(value[0]);
       return [
      Date.UTC(d.getFullYear(), d.getUTCMonth(), d.getUTCDate()),
      value[5]
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
app.post('/get-two-cities-data', (req, res) => {
  console.log('hot tow ceities')
  if ('city_name1' in req.body && 'city_name2' in req.body && 'aspect' in req.body && 'start_date' in req.body && 'end_date' in req.body) {
    let city_name1 = req.body.city_name1;
    let city_name2 = req.body.city_name2;
    let aspect = req.body.aspect;
    let start_date = req.body.start_date;
    let end_date = req.body.end_date;
    console.log(start_date, end_date)
    let query = `select to_char(w_date, 'mm/dd/yyyy') as w_date, aspect, unit, m1, c1, m2, c2 from ((select LAST_DAY(TO_DATE(x || y || '-01', 'YYYY-MM-DD')) as w_date, m1, c1, aspect, unit from (select to_char(w_date, 'yyyy') as x, to_char(w_date, 'mm') as y, avg(metric_value) as m1, city_name as c1, aspect, unit from MANIKA.CITY NATURAL JOIN MANIKA.IS_AFFECTED_BY NATURAL JOIN MANIKA.WEATHER where aspect = :asp1 and city_name= :city1 group by to_char(w_date, 'yyyy'), to_char(w_date, 'mm'), city_name, aspect, unit order by to_char(w_date, 'yyyy'))) NATURAL JOIN (select LAST_DAY(TO_DATE(x || y || '-01', 'YYYY-MM-DD')) as w_date, m2, c2, aspect, unit from (select to_char(w_date, 'yyyy') as x, to_char(w_date, 'mm') as y, avg(metric_value) as m2, city_name as c2, aspect, unit from MANIKA.CITY NATURAL JOIN MANIKA.IS_AFFECTED_BY NATURAL JOIN MANIKA.WEATHER where aspect = :asp2 and city_name= :city2 group by to_char(w_date, 'yyyy'), to_char(w_date, 'mm'), city_name, aspect, unit order by to_char(w_date, 'yyyy')))) where w_date BETWEEN TO_DATE (:d1, 'mm/dd/yyyy') AND TO_DATE (:d2, 'mm/dd/yyyy')`;
    queryExecuteWithOracle(query, [aspect, city_name1, aspect, city_name2,start_date, end_date], passResults)
    .then(result => {
      let newR = transformWeatherPageData(result)
      res.send({
        result: newR
      });
    })
    .catch(err => {
      res.send({
        error: "Some error with the connection setup"
      });
    });
  }
})

app.post("/get-city-aspects", (req, res) => {

  console.log(req.body, "i am here")
  if (true) {
    let city_name = req.body.city_name
    let start_date = req.body.start_date;
    let end_date = req.body.end_date;
    const query = `select to_char(w_date, 'mm/dd/yyyy') as w_date, city_name, a1, u1, m1, a2, u2, m2, a3, u3, m3, a4, u4, m4, a5, u5, m5  from ((select LAST_DAY(TO_DATE(x || y || '-01', 'YYYY-MM-DD')) as w_date, city_name, a1, u1, m1 from (select to_char(w_date, 'yyyy') as x, to_char(w_date, 'mm') as y,city_name,  avg(metric_value) as m1 , aspect as a1, unit as u1 from MANIKA.CITY NATURAL JOIN MANIKA.IS_AFFECTED_BY NATURAL JOIN MANIKA.WEATHER where aspect = :as1 and city_name=:city group by to_char(w_date, 'yyyy'), to_char(w_date, 'mm'), city_name, aspect, unit order by to_char(w_date, 'yyyy'))) NATURAL JOIN (select LAST_DAY(TO_DATE(x || y || '-01', 'YYYY-MM-DD')) as w_date, city_name, a2, u2, m2 from (select to_char(w_date, 'yyyy') as x, to_char(w_date, 'mm') as y,city_name,  avg(metric_value) as m2 , aspect as a2, unit as u2 from MANIKA.CITY NATURAL JOIN MANIKA.IS_AFFECTED_BY NATURAL JOIN MANIKA.WEATHER where aspect = :as2 and city_name=:city group by to_char(w_date, 'yyyy'), to_char(w_date, 'mm'), city_name, aspect, unit order by to_char(w_date, 'yyyy'))) NATURAL JOIN (select LAST_DAY(TO_DATE(x || y || '-01', 'YYYY-MM-DD')) as w_date, city_name, a3, u3, m3 from (select to_char(w_date, 'yyyy') as x, to_char(w_date, 'mm') as y,city_name,  avg(metric_value) as m3 , aspect as a3, unit as u3 from MANIKA.CITY NATURAL JOIN MANIKA.IS_AFFECTED_BY NATURAL JOIN MANIKA.WEATHER where aspect = :as3 and city_name=:city group by to_char(w_date, 'yyyy'), to_char(w_date, 'mm'), city_name, aspect, unit order by to_char(w_date, 'yyyy'))) NATURAL JOIN (select LAST_DAY(TO_DATE(x || y || '-01', 'YYYY-MM-DD')) as w_date, city_name, a4, u4, m4 from (select to_char(w_date, 'yyyy') as x, to_char(w_date, 'mm') as y,city_name,  avg(metric_value) as m4 , aspect as a4, unit as u4 from MANIKA.CITY NATURAL JOIN MANIKA.IS_AFFECTED_BY NATURAL JOIN MANIKA.WEATHER where aspect = :as4 and city_name=:city group by to_char(w_date, 'yyyy'), to_char(w_date, 'mm'), city_name, aspect, unit order by to_char(w_date, 'yyyy'))) NATURAL JOIN (select LAST_DAY(TO_DATE(x || y || '-01', 'YYYY-MM-DD')) as w_date, city_name, a5, u5, m5 from (select to_char(w_date, 'yyyy') as x, to_char(w_date, 'mm') as y,city_name,  avg(metric_value) as m5 , aspect as a5, unit as u5 from MANIKA.CITY NATURAL JOIN MANIKA.IS_AFFECTED_BY NATURAL JOIN MANIKA.WEATHER where aspect = :as5 and city_name=:city group by to_char(w_date, 'yyyy'), to_char(w_date, 'mm'), city_name, aspect, unit order by to_char(w_date, 'yyyy')))) WHERE w_date BETWEEN TO_DATE (:d1, 'mm/dd/yyyy') AND TO_DATE (:d2, 'mm/dd/yyyy')`    
    queryExecuteWithOracle(query, ['Humidity', 'New York', 'Temperature', 'New York', 'Pressure', 'New York', 'Wind Speed', 'New York', 'Wind Direction', 'New York','28/02/2013', '28/02/2013'], passResults)
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
  } else {
    return res.send({
      error: "Low number of attributes"
    })
  }

});

app.post("/test1", (req, res) => {

  console.log(req.body, "i am here")
  if ('city_name' in req.body && 'start_date' in req.body && 'end_date' in req.body) {
    let city_name = req.body.city_name
    let start_date = req.body.start_date;
    let end_date = req.body.end_date;
    
    const query = `select to_char(w_date, 'mm/dd/yyyy') as w_date, city_name, s1, pn1, mv1, mx1, mh1, aqi1, s2, pn2, mv2, mx2, mh2, aqi2, s3, pn3, mv3, mx3, mh3, aqi3,s4, pn4, mv4, mx4, mh4, aqi4 from ((select LAST_DAY(TO_DATE(x || y || '-01', 'YYYY-MM-DD')) as w_date, city_name, s1, pn1, mv1, mx1, mh1, aqi1 from (select to_char(po_date, 'yyyy') as x, to_char(po_date, 'mm') as y, city_name as city_name, symbol as s1, pollutant_name as pn1, avg(mean_value) as mv1, max(max_value) as mx1, avg(max_hour) as mh1, avg(aqi) as aqi1 from manika.city NATURAL JOIN MANIKA.IS_POLLUTED_BY NATURAL JOIN MANIKA.POLLUTANT where city_name=:city1 and symbol = 'NO2' and pollutant_name = 'Nitrogen Dioxide' group by to_char(po_date, 'yyyy'), to_char(po_date, 'mm'), city_name, symbol, pollutant_name order by to_char(po_date, 'yyyy'))) NATURAL JOIN (select LAST_DAY(TO_DATE(x || y || '-01', 'YYYY-MM-DD')) as w_date, city_name, s2, pn2, mv2, mx2, mh2, aqi2 from (select to_char(po_date, 'yyyy') as x, to_char(po_date, 'mm') as y, city_name as city_name, symbol as s2, pollutant_name as pn2, avg(mean_value) as mv2, max(max_value) as mx2, avg(max_hour) as mh2, avg(aqi) as aqi2 from manika.city NATURAL JOIN MANIKA.IS_POLLUTED_BY NATURAL JOIN MANIKA.POLLUTANT where city_name=:city2 and symbol = 'SO2' and pollutant_name = 'Sulfur Dioxide' group by to_char(po_date, 'yyyy'), to_char(po_date, 'mm'), city_name, symbol, pollutant_name order by to_char(po_date, 'yyyy'))) NATURAL JOIN (select LAST_DAY(TO_DATE(x || y || '-01', 'YYYY-MM-DD')) as w_date, city_name, s3, pn3, mv3, mx3, mh3, aqi3 from (select to_char(po_date, 'yyyy') as x, to_char(po_date, 'mm') as y, city_name as city_name, symbol as s3, pollutant_name as pn3, avg(mean_value) as mv3, max(max_value) as mx3, avg(max_hour) as mh3, avg(aqi) as aqi3 from manika.city NATURAL JOIN MANIKA.IS_POLLUTED_BY NATURAL JOIN MANIKA.POLLUTANT where city_name=:city3 and symbol = 'O3' and pollutant_name = 'Ozone' group by to_char(po_date, 'yyyy'), to_char(po_date, 'mm'), city_name, symbol, pollutant_name order by to_char(po_date, 'yyyy'))) NATURAL JOIN (select LAST_DAY(TO_DATE(x || y || '-01', 'YYYY-MM-DD')) as w_date, city_name, s4, pn4, mv4, mx4, mh4, aqi4 from (select to_char(po_date, 'yyyy') as x, to_char(po_date, 'mm') as y, city_name as city_name, symbol as s4, pollutant_name as pn4, avg(mean_value) as mv4, max(max_value) as mx4, avg(max_hour) as mh4, avg(aqi) as aqi4 from manika.city NATURAL JOIN MANIKA.IS_POLLUTED_BY NATURAL JOIN MANIKA.POLLUTANT where city_name=:city4 and symbol = 'CO' and pollutant_name = 'Carbon Monoxide' group by to_char(po_date, 'yyyy'), to_char(po_date, 'mm'), city_name, symbol, pollutant_name order by to_char(po_date, 'yyyy')))) WHERE w_date BETWEEN TO_DATE (:d1, 'mm/dd/yyyy') AND TO_DATE (:d2, 'mm/dd/yyyy')`
    queryExecuteWithOracle(query, [city_name, city_name, city_name, city_name, start_date, end_date], passResults)
      .then(result => {
        let newR = transformResultForPollutant(result);
        res.send({
          result: newR
        });
      })
      .catch(err => {
        res.send({
          error: "Some error with the connection setup"
        });
      });
  } else {
    return res.send({
      error: "Low number of attributes"
    })
  }

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
/////////////// Chris D's Code

app.post('/get-query', (req, res) => {

  if ('query' in req.body) {
    let query = req.body.query;
    queryExecuteWithOracle(query,[],passResults)
      .then((result) => {
        console.log("ASDFASDF");
        console.log(result);
      
        res.send({
          "result": result[0][0]
        })
      })
      .catch(err => {
        res.send({
          "error": "Some error with the connection setup"
        })
      })
    } else {
      res.send({
        "error": "No query found !"
      })
    }
 
 });
 
function treatCityWeather(result) {

  // Treat Decimals
  result.humi_13 = parseFloat(parseFloat(Math.round(parseFloat(result.humi_13) * 100) / 100).toFixed(3));
  result.humi_14 = parseFloat(parseFloat(Math.round(parseFloat(result.humi_14) * 100) / 100).toFixed(3));
  result.humi_15 = parseFloat(parseFloat(Math.round(parseFloat(result.humi_15) * 100) / 100).toFixed(3));
  result.pres_13 = parseFloat(parseFloat(Math.round(parseFloat(result.pres_13) * 100) / 100).toFixed(3));
  result.pres_14 = parseFloat(parseFloat(Math.round(parseFloat(result.pres_14) * 100) / 100).toFixed(3));
  result.pres_15 = parseFloat(parseFloat(Math.round(parseFloat(result.pres_15) * 100) / 100).toFixed(3));
  result.temp_13 = parseFloat(parseFloat(Math.round(parseFloat(result.temp_13) * 100) / 100).toFixed(3));
  result.temp_14 = parseFloat(parseFloat(Math.round(parseFloat(result.temp_14) * 100) / 100).toFixed(3));
  result.temp_15 = parseFloat(parseFloat(Math.round(parseFloat(result.temp_15) * 100) / 100).toFixed(3));
  result.direc_13 = parseFloat(parseFloat(Math.round(parseFloat(result.direc_13) * 100) / 100).toFixed(3));
  result.direc_14 = parseFloat(parseFloat(Math.round(parseFloat(result.direc_14) * 100) / 100).toFixed(3));
  result.direc_15 = parseFloat(parseFloat(Math.round(parseFloat(result.direc_15) * 100) / 100).toFixed(3));
  result.spe_13 = parseFloat(parseFloat(Math.round(parseFloat(result.spe_13) * 100) / 100).toFixed(3));
  result.spe_14 = parseFloat(parseFloat(Math.round(parseFloat(result.spe_14) * 100) / 100).toFixed(3));
  result.spe_15 = parseFloat(parseFloat(Math.round(parseFloat(result.spe_15) * 100) / 100).toFixed(3));

  return result;
}

function passCityWeather(result) {

  return {
    humi_13: result[0][2],
    humi_14: result[1][2],
    humi_15: result[2][2],
    pres_13: result[3][2],
    pres_14: result[4][2],
    pres_15: result[5][2],
    temp_13: result[6][2],
    temp_14: result[7][2],
    temp_15: result[8][2],
    direc_13: result[9][2],
    direc_14: result[10][2],
    direc_15: result[11][2],
    spe_13: result[12][2],
    spe_14: result[13][2],
    spe_15: result[14][2]
  }
  
}

function treatCityPollution(result) {

  result.no2_avg_13 = parseFloat(parseFloat(Math.round(parseFloat(result.no2_avg_13) * 100) / 100).toFixed(3));
  result.no2_avg_14 = parseFloat(parseFloat(Math.round(parseFloat(result.no2_avg_14) * 100) / 100).toFixed(3));
  result.no2_avg_15 = parseFloat(parseFloat(Math.round(parseFloat(result.no2_avg_15) * 100) / 100).toFixed(3));
  result.no2_max_13 = parseFloat(parseFloat(Math.round(parseFloat(result.no2_max_13) * 100) / 100).toFixed(3));
  result.no2_max_14 = parseFloat(parseFloat(Math.round(parseFloat(result.no2_max_14) * 100) / 100).toFixed(3));
  result.no2_max_15 = parseFloat(parseFloat(Math.round(parseFloat(result.no2_max_15) * 100) / 100).toFixed(3));
  result.no2_aqi_13 = parseFloat(parseFloat(Math.round(parseFloat(result.no2_aqi_13) * 100) / 100).toFixed(3));
  result.no2_aqi_14 = parseFloat(parseFloat(Math.round(parseFloat(result.no2_aqi_14) * 100) / 100).toFixed(3));
  result.no2_aqi_15 = parseFloat(parseFloat(Math.round(parseFloat(result.no2_aqi_15) * 100) / 100).toFixed(3));

  result.o3_avg_13 = parseFloat(parseFloat(Math.round(parseFloat(result.o3_avg_13) * 100) / 100).toFixed(3));
  result.o3_avg_14 = parseFloat(parseFloat(Math.round(parseFloat(result.o3_avg_14) * 100) / 100).toFixed(3));
  result.o3_avg_15 = parseFloat(parseFloat(Math.round(parseFloat(result.o3_avg_15) * 100) / 100).toFixed(3));

  result.o3_max_13 = parseFloat(parseFloat(Math.round(parseFloat(result.o3_max_13) * 100) / 100).toFixed(3));
  result.o3_max_14 = parseFloat(parseFloat(Math.round(parseFloat(result.o3_max_14) * 100) / 100).toFixed(3));
  result.o3_max_15 = parseFloat(parseFloat(Math.round(parseFloat(result.o3_max_15) * 100) / 100).toFixed(3));

  result.o3_aqi_13 = parseFloat(parseFloat(Math.round(parseFloat(result.o3_aqi_13) * 100) / 100).toFixed(3));
  result.o3_aqi_14 = parseFloat(parseFloat(Math.round(parseFloat(result.o3_aqi_14) * 100) / 100).toFixed(3));
  result.o3_aqi_15 = parseFloat(parseFloat(Math.round(parseFloat(result.o3_aqi_15) * 100) / 100).toFixed(3));

  result.so2_avg_13 = parseFloat(parseFloat(Math.round(parseFloat(result.so2_avg_13) * 100) / 100).toFixed(3));
  result.so2_avg_14 = parseFloat(parseFloat(Math.round(parseFloat(result.so2_avg_14) * 100) / 100).toFixed(3));
  result.so2_avg_15 = parseFloat(parseFloat(Math.round(parseFloat(result.so2_avg_15) * 100) / 100).toFixed(3));

  result.so2_max_13 = parseFloat(parseFloat(Math.round(parseFloat(result.so2_max_13) * 100) / 100).toFixed(3));
  result.so2_max_14 = parseFloat(parseFloat(Math.round(parseFloat(result.so2_max_14) * 100) / 100).toFixed(3));
  result.so2_max_15 = parseFloat(parseFloat(Math.round(parseFloat(result.so2_max_15) * 100) / 100).toFixed(3));

  result.so2_aqi_13 = parseFloat(parseFloat(Math.round(parseFloat(result.so2_aqi_13) * 100) / 100).toFixed(3));
  result.so2_aqi_14 = parseFloat(parseFloat(Math.round(parseFloat(result.so2_aqi_14) * 100) / 100).toFixed(3));
  result.so2_aqi_15 = parseFloat(parseFloat(Math.round(parseFloat(result.so2_aqi_15) * 100) / 100).toFixed(3));

  result.co_avg_13 = parseFloat(parseFloat(Math.round(parseFloat(result.co_avg_13) * 100) / 100).toFixed(3));
  result.co_avg_14 = parseFloat(parseFloat(Math.round(parseFloat(result.co_avg_14) * 100) / 100).toFixed(3));
  result.co_avg_15 = parseFloat(parseFloat(Math.round(parseFloat(result.co_avg_15) * 100) / 100).toFixed(3));

  result.co_max_13 = parseFloat(parseFloat(Math.round(parseFloat(result.co_max_13) * 100) / 100).toFixed(3));
  result.co_max_14 = parseFloat(parseFloat(Math.round(parseFloat(result.co_max_14) * 100) / 100).toFixed(3));
  result.co_max_15 = parseFloat(parseFloat(Math.round(parseFloat(result.co_max_15) * 100) / 100).toFixed(3));

  result.co_aqi_13 = parseFloat(parseFloat(Math.round(parseFloat(result.co_aqi_13) * 100) / 100).toFixed(3));
  result.co_aqi_14 = parseFloat(parseFloat(Math.round(parseFloat(result.co_aqi_14) * 100) / 100).toFixed(3));
  result.co_aqi_15 = parseFloat(parseFloat(Math.round(parseFloat(result.co_aqi_15) * 100) / 100).toFixed(3));

  return(result);
}

function passCityPollution(result) {

  return {
    no2_avg_14: result[0][2],
    no2_max_14: result[0][3],
    no2_aqi_14: result[0][5],
    o3_avg_14: result[1][2],
    o3_max_14: result[1][3],
    o3_aqi_14: result[1][5],
    so2_avg_14: result[2][2],
    so2_max_14: result[2][3],
    so2_aqi_14: result[2][5],
    co_avg_14: result[3][2],
    co_max_14: result[3][3],
    co_aqi_14: result[3][5],
    no2_avg_13: result[4][2],
    no2_max_13: result[4][3],
    no2_aqi_13: result[4][5],
    o3_avg_13: result[5][2],
    o3_max_13: result[5][3],
    o3_aqi_13: result[5][5],
    so2_avg_13: result[6][2],
    so2_max_13: result[6][3],
    so2_aqi_13: result[6][5],
    co_avg_13: result[7][2],
    co_max_13: result[7][3],
    co_aqi_13: result[7][5],
    no2_avg_15: result[8][2],
    no2_max_15: result[8][3],
    no2_aqi_15: result[8][5],
    o3_avg_15: result[9][2],
    o3_max_15: result[9][3],
    o3_aqi_15: result[9][5],
    so2_avg_15: result[10][2],
    so2_max_15: result[10][3],
    so2_aqi_15: result[10][5],
    co_avg_15: result[11][2],
    co_max_15: result[11][3],
    co_aqi_15: result[11][5],
  }
}

function passHottest(result) {
  
  return {
    hot_date: result[0][0],
    hot_val: result[0][1]
  }
}

function treatHottest(result) {

  result.hot_val = parseFloat(parseFloat(Math.round(parseFloat(result.hot_val) * 100) / 100).toFixed(3));
  result.hot_val = result.hot_val + " F";

  var yyyy = result.hot_date.getFullYear(); 
  var dd = result.hot_date.getDate();
  var mm = result.hot_date.getMonth() + 1;

  if (dd < 10) {
    dd = '0' + dd;
  }

  if (mm < 10) {
    mm = '0'+mm;
  }

  result.hot_date = yyyy + '-' + mm + '-' + dd;

  return result;
}

function passColdest(result) {
  
  return {
    cold_date: result[0][0],
    cold_val: result[0][1]
  }
}

function treatColdest(result) {

  result.cold_val = parseFloat(parseFloat(Math.round(parseFloat(result.cold_val) * 100) / 100).toFixed(3));
  result.cold_val = result.cold_val + " F";

  var yyyy = result.cold_date.getFullYear(); 
  var dd = result.cold_date.getDate();
  var mm = result.cold_date.getMonth() + 1;

  if (dd < 10) {
    dd = '0' + dd;
  }

  if (mm < 10) {
    mm = '0'+mm;
  }

  result.cold_date = yyyy + '-' + mm + '-' + dd;

  return result;
}

function passDry(result) {
  return {
    dry_date: result[0][0],
    dry_val: result[0][1]
  }
}

function treatDry(result) {
  result.dry_val = parseFloat(parseFloat(Math.round(parseFloat(result.dry_val) * 100) / 100).toFixed(3));
  result.dry_val = result.dry_val + "% (Humidity)";

  var yyyy = result.dry_date.getFullYear(); 
  var dd = result.dry_date.getDate();
  var mm = result.dry_date.getMonth() + 1;

  if (dd < 10) {
    dd = '0' + dd;
  }

  if (mm < 10) {
    mm = '0'+mm;
  }

  result.dry_date = yyyy + '-' + mm + '-' + dd;

  return result;
}

function passWind(result) {
  return {
    wind_date: result[0][0],
    wind_val: result[0][1]
  }
}

function treatWind(result) {
  result.wind_val = parseFloat(parseFloat(Math.round(parseFloat(result.wind_val) * 100) / 100).toFixed(3));
  result.wind_val = result.wind_val + " mph";

  var yyyy = result.wind_date.getFullYear(); 
  var dd = result.wind_date.getDate();
  var mm = result.wind_date.getMonth() + 1;

  if (dd < 10) {
    dd = '0' + dd;
  }

  if (mm < 10) {
    mm = '0'+mm;
  }

  result.wind_date = yyyy + '-' + mm + '-' + dd;

  return result;
}

app.post('/get-city-weather', (req, res) => {

  let body = req.body;

  if ('city_name' in req.body) {

    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth() + 1;

    if (dd < 10) {
      dd = '0' + dd;
    }

    if (mm < 10) {
      mm = '0'+mm;
    }

    let name = req.body.city_name;
    let date1 = '2013' + '-' + mm + '-' + dd;
    let date2 = '2014' + '-' + mm + '-' + dd;
    let date3 = '2015' + '-' + mm + '-' + dd;

    console.log("Name: " + name);
    console.log("Date1:" + date1);
    console.log("Date2:" + date2);
    console.log("Date3:" + date3);

    queryExecuteWithOracle(`select w_date, aspect, metric_value from ${dbuser}is_affected_by where city_name=:name and (w_date=to_date(:date1,'YYYY-MM-DD') or w_date=to_date(:date2,'YYYY-MM-DD') or w_date=to_date(:date3,'YYYY-MM-DD'))`, [name,date1,date2,date3], passCityWeather)
      .then((result) => {
        let newResult = treatCityWeather(result);
        res.send({
          "result": newResult
        })
      })
      .catch(err => {
        res.send({
          "error": "Some error with the connection setup"
        })
      })

  } 
});

app.post('/get-city-pollution', (req, res) => {

  let body = req.body;

  if ('city_name' in req.body) {

    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth() + 1;

    if (dd < 10) {
      dd = '0' + dd;
    }

    if (mm < 10) {
      mm = '0'+mm;
    }

    let name = req.body.city_name;
    let date1 = '2013' + '-' + mm + '-' + dd;
    let date2 = '2014' + '-' + mm + '-' + dd;
    let date3 = '2015' + '-' + mm + '-' + dd;

    console.log("Name: " + name);
    console.log("Date1:" + date1);
    console.log("Date2:" + date2);
    console.log("Date3:" + date3);

    queryExecuteWithOracle(`select po_date,symbol, mean_value, max_value, max_hour, aqi from ${dbuser}is_polluted_by where city_name=:name and (po_date=to_date(:date1,'YYYY-MM-DD') or po_date=to_date(:date2,'YYYY-MM-DD') or po_date=to_date(:date3,'YYYY-MM-DD'))`, [name,date1,date2,date3], passCityPollution)
      .then((result) => {
        let newResult = treatCityPollution(result);
        res.send({
          "result": newResult
        })
      })
      .catch(err => {
        res.send({
          "error": "Some error with the connection setup"
        })
      })

  } 
});

app.post('/get-hottest', (req, res) => {

  let body = req.body;

  if ('city_name' in req.body) {

    let name = req.body.city_name;

    console.log("Name: " + name);

    queryExecuteWithOracle(`select w_date, max_val from (select w_date,metric_value as max_val from manika.is_affected_by where city_name=:name and aspect='Temperature') where max_val=( select max(metric_value) from manika.is_affected_by where city_name=:name and aspect='Temperature')`, [name], passHottest)
      .then((result) => {
        console.log(result);
        let newResult = treatHottest(result);
        res.send({
          "result": newResult
        })
      })
      .catch(err => {
        res.send({
          "error": "Some error with the connection setup"
        })
      })

  } 
});

app.post('/get-coldest', (req, res) => {

  let body = req.body;

  if ('city_name' in req.body) {

    let name = req.body.city_name;

    console.log("Name: " + name);

    queryExecuteWithOracle(`select w_date, min_val from (select w_date,metric_value as min_val from manika.is_affected_by where city_name=:name and aspect='Temperature') where min_val=( select min(metric_value) from manika.is_affected_by where city_name=:name and aspect='Temperature')`, [name], passColdest)
      .then((result) => {
        console.log(result);
        let newResult = treatColdest(result);
        res.send({
          "result": newResult
        })
      })
      .catch(err => {
        res.send({
          "error": "Some error with the connection setup"
        })
      })

  } 
});

app.post('/get-dry', (req, res) => {

  let body = req.body;

  if ('city_name' in req.body) {

    let name = req.body.city_name;

    console.log("Name: " + name);

    queryExecuteWithOracle(`select w_date, min_val from (select w_date,metric_value as min_val from manika.is_affected_by where city_name=:name and aspect='Humidity') where min_val=( select min(metric_value) from manika.is_affected_by where city_name=:name and aspect='Humidity')`, [name], passDry)
      .then((result) => {
        console.log(result);
        let newResult = treatDry(result);
        res.send({
          "result": newResult
        })
      })
      .catch(err => {
        res.send({
          "error": "Some error with the connection setup"
        })
      })

  } 
});

app.post('/get-wind', (req, res) => {

  let body = req.body;

  if ('city_name' in req.body) {

    let name = req.body.city_name;

    console.log("Name: " + name);

    queryExecuteWithOracle(`select w_date, max_val from (select w_date,metric_value as max_val from manika.is_affected_by where city_name=:name and aspect='Wind Speed') where max_val=( select max(metric_value) from manika.is_affected_by where city_name=:name and aspect='Wind Speed')`, [name], passWind)
      .then((result) => {
        console.log(result);
        let newResult = treatWind(result);
        res.send({
          "result": newResult
        })
      })
      .catch(err => {
        res.send({
          "error": "Some error with the connection setup"
        })
      })

  } 
});


//////////////////////////// CHRIS' code ends



////////////////////////////////// CHRIS K code 

fire_data = result => {
  

  if (result.length === 0) {
    return {
      error: "No data found !"
    };
  }


  let title;

  // let data = [];

  title = result[0][0];


  let data1 = result.map(value => {
    var d = new Date(value[1]);
    return [
      Date.UTC(d.getFullYear(), d.getUTCMonth(), d.getUTCDate()),
      value[2]
    ];
  })

  let data2 = result.map(value => {
    var d = new Date(value[1]);
    return [
      Date.UTC(d.getFullYear(), d.getUTCMonth(), d.getUTCDate()),
      value[3]*100
    ];
  })

  let data3 = result.map(value => {
    var d = new Date(value[1]);
    return [
      Date.UTC(d.getFullYear(), d.getUTCMonth(), d.getUTCDate()),
      value[4]*10
    ];
  })
    let data4 = result.map(value => {
    var d = new Date(value[1]);
    return [
      Date.UTC(d.getFullYear(), d.getUTCMonth(), d.getUTCDate()),
      value[5]*10
    ];
  })

  let events = []

  result.forEach(value => {
    const event_type = value[7]
    var d = new Date(value[1]);

    if (event_type !== null) {
       if (event_type === 'E') {
        events.push({
        color: '#9C27B0', // Red
        width: 2,
        // zIndex: 5,
        //dashStyle: 'Dash',
        value: Date.UTC(d.getFullYear(), d.getUTCMonth(), d.getUTCDate())
      })

      }

      else if (event_type === 'F') {
        events.push({
        color: '#E91E63', // Red
        width: 3,
        //dashStyle: 'Dash',
        value: Date.UTC(d.getFullYear(), d.getUTCMonth(), d.getUTCDate())
      })

      }
      //#
      else if (event_type === 'G') {
        events.push({
        color: '#F44336', // Red
        width: 5,
        //dashStyle: 'Dash',
        value: Date.UTC(d.getFullYear(), d.getUTCMonth(), d.getUTCDate())
      })

      }
    }
  })

  let re =  {
    title: title,
    data1: data1,
    data2: data2,
    data3: data3,
    data4: data4,
    events: events,
    xAxisName: "Year",

  };

  // console.log(re)
  return re;
};

// var reg_name = "'South East'";
// var s_date = "";
// var e_date = "";
var no2_symbol = "'NO2'";
var o3_symbol = "'O3'";
var so2_symbol = "'SO2'";
var co_symbol = "'CO'";

app.post("/get_events", (req, res) => {
  // console.log("Ye bhais aab", req.body);
  console.log(req.body.s_date);
  //TODO copy-paste with other chemicals and join on (po_date)
  //TODO left-outer-join with event data, and generate chart
  queryExecuteWithOracle(`
    select * from (select * from (select * from (select region_name, po_date, avg(m1), avg(m2), avg(m3), avg(m4) from ((select region_name, po_date, city_name, mean_value as m1 from MANIKA.REGION NATURAL JOIN MANIKA.CITY NATURAL JOIN MANIKA.IS_POLLUTED_BY NATURAL JOIN MANIKA.POLLUTANT where symbol = 'NO2') NATURAL JOIN (select region_name, po_date, city_name, mean_value as m2 from MANIKA.REGION NATURAL JOIN MANIKA.CITY NATURAL JOIN MANIKA.IS_POLLUTED_BY NATURAL JOIN MANIKA.POLLUTANT where symbol = 'O3') NATURAL JOIN (select region_name, po_date, city_name, mean_value as m3 from MANIKA.REGION NATURAL JOIN MANIKA.CITY NATURAL JOIN MANIKA.IS_POLLUTED_BY NATURAL JOIN MANIKA.POLLUTANT where symbol = 'SO2') NATURAL JOIN (select region_name, po_date, city_name, mean_value as m4 from MANIKA.REGION NATURAL JOIN MANIKA.CITY NATURAL JOIN MANIKA.IS_POLLUTED_BY NATURAL JOIN MANIKA.POLLUTANT where symbol = 'CO'))  group by region_name, po_date) where region_name = :r1 and po_date BETWEEN TO_DATE (:d1, 'yyyy/mm/dd') AND TO_DATE (:d2, 'yyyy/mm/dd') order by po_date) LEFT FULL OUTER JOIN (select * from MANIKA.EVENT NATURAL JOIN MANIKA.OCCURS_IN where region_name = :r2 and o_date BETWEEN TO_DATE (:d3, 'yyyy/mm/dd') AND TO_DATE (:d4, 'yyyy/mm/dd')) ON o_date = po_date) order by po_date`
    , [req.body.r_name, req.body.s_date, req.body.e_date, req.body.r_name, req.body.s_date, req.body.e_date], fire_data)
// req.body.r_name, req.body.s_date, req.body.e_date, req.body.r_name, req.body.s_date, req.body.e_date
    .then(result => {
      // console.log(result);
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




///////////////////////////////////////////////////////////////




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

  att1 = results[0][2];
  att1Unit = results[0][3];
  att2 = results[0][5];
  att2Unit = results[0][6];
  cityName = results[0][0];

  yAxisName = `${att1} (${att1Unit}) and ${att2} (${att2Unit})`
  title = `${cityName} : ${att1} vs. ${att2}`

  let attData1 = results.map(value => {
    var d = new Date(value[1]);
    return [
      Date.UTC(d.getFullYear(), d.getUTCMonth(), d.getUTCDate()),
      value[4]
    ];
  })

  let attData2 = results.map(value => {
    var d = new Date(value[1]);
    return [
      Date.UTC(d.getFullYear(), d.getUTCMonth(), d.getUTCDate()),
      value[7]
    ];
  })

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


transformResultForPollutant = (result) => {
  console.log(result[0])

  if (result.length === 0) {
    return {
      error: "No data found !"
    };
  }


  let title, yAxisName, xAxisName, pName1, pSymbol1, pName2, pSymbol2, pName3, pSymbol3, pName4, pSymbol4, cityName;


  cityName = result[0][1]
  pName1 = result[0][3]
  pSymbol1 = result[0][2]

  pName2 = result[0][9]
  pSymbol2 = result[0][8]

  pName3 = result[0][15]
  pSymbol3 = result[0][14]

  pName4 = result[0][21]
  pSymbol4 = result[0][20]
  console.log('cam here', pName1, pName2, pName3, pName4)



  yAxisName = `${pName1} (${pSymbol1}) and ${pName2} (${pSymbol2}) and ${pName3} (${pSymbol3}) and ${pName4} (${pSymbol4})`

  title = `${cityName} : ${pSymbol1} vs. ${pSymbol2} vs. ${pSymbol3} vs. ${pSymbol4}`

  let pData1 = result.map(value => {
    var d = new Date(value[0]);
    return [
      Date.UTC(d.getFullYear(), d.getUTCMonth(), d.getUTCDate()),
      value[4]
    ];
  })

  let pData2 = result.map(value => {
    var d = new Date(value[0]);
    return [
      Date.UTC(d.getFullYear(), d.getUTCMonth(), d.getUTCDate()),
      value[5]
    ];
  })
  let pData3 = result.map(value => {
    var d = new Date(value[0]);
    return [
      Date.UTC(d.getFullYear(), d.getUTCMonth(), d.getUTCDate()),
      value[6]
    ];
  })
  let pData4 = result.map(value => {
    var d = new Date(value[0]);
    return [
      Date.UTC(d.getFullYear(), d.getUTCMonth(), d.getUTCDate()),
      value[7]
    ];
  })
  let pData5 = result.map(value => {
    var d = new Date(value[0]);
    return [
      Date.UTC(d.getFullYear(), d.getUTCMonth(), d.getUTCDate()),
      value[10]
    ];
  })
  let pData6 = result.map(value => {
    var d = new Date(value[0]);
    return [
      Date.UTC(d.getFullYear(), d.getUTCMonth(), d.getUTCDate()),
      value[11]
    ];
  })
  let pData7 = result.map(value => {
    var d = new Date(value[0]);
    return [
      Date.UTC(d.getFullYear(), d.getUTCMonth(), d.getUTCDate()),
      value[12]
    ];
  })
  let pData8 = result.map(value => {
    var d = new Date(value[0]);
    return [
      Date.UTC(d.getFullYear(), d.getUTCMonth(), d.getUTCDate()),
      value[13]
    ];
  })
  let pData9 = result.map(value => {
    var d = new Date(value[0]);
    return [
      Date.UTC(d.getFullYear(), d.getUTCMonth(), d.getUTCDate()),
      value[16]
    ];
  })
  let pData10 = result.map(value => {
    var d = new Date(value[0]);
    return [
      Date.UTC(d.getFullYear(), d.getUTCMonth(), d.getUTCDate()),
      value[17]
    ];
  })
  let pData11 = result.map(value => {
    var d = new Date(value[0]);
    return [
      Date.UTC(d.getFullYear(), d.getUTCMonth(), d.getUTCDate()),
      value[18]
    ];
  })
  let pData12 = result.map(value => {
    var d = new Date(value[0]);
    return [
      Date.UTC(d.getFullYear(), d.getUTCMonth(), d.getUTCDate()),
      value[19]
    ];
  })
  let pData13 = result.map(value => {
    var d = new Date(value[0]);
    return [
      Date.UTC(d.getFullYear(), d.getUTCMonth(), d.getUTCDate()),
      value[22]
    ];
  })
  let pData14 = result.map(value => {
    var d = new Date(value[0]);
    return [
      Date.UTC(d.getFullYear(), d.getUTCMonth(), d.getUTCDate()),
      value[23]
    ];
  })
  let pData15 = result.map(value => {
    var d = new Date(value[0]);
    return [
      Date.UTC(d.getFullYear(), d.getUTCMonth(), d.getUTCDate()),
      value[24]
    ];
  })
  let pData16 = result.map(value => {
    var d = new Date(value[0]);
    return [
      Date.UTC(d.getFullYear(), d.getUTCMonth(), d.getUTCDate()),
      value[25]
    ];
  })
  
  let re =  {
    title: title,
    name1: `${pName1} (${pSymbol1})`,
    name2: `${pName2} (${pSymbol2})`,
    name3: `${pName3} (${pSymbol3})`,
    name4: `${pName4} (${pSymbol4})`,

    xAxisName: "Year",
    yAxisName: yAxisName,

    data1: pData1,
    data2: pData2,
    data3: pData3,
    data4: pData4,
    data5: pData5,
    data6: pData6,
    data7: pData7,
    data8: pData8,
    data9: pData9,
    data10: pData10,
    data11: pData12,
    data13: pData13,
    data14: pData14,
    data15: pData15,
    data16: pData16,
  };

  return re;
}

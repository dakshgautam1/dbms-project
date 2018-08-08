const query1 = `select * from MANIKA.CITY NATURAL JOIN MANIKA.IS_AFFECTED_BY NATURAL JOIN MANIKA.WEATHER`;

//const query2 = `select * from (select c2.aspect, c1.w_date as w_date, c1.f1 as city1_values, c1.city1, c2.f2  as city2_values, c2.city2, c2.unit from ((select w_date, metric_value as f1, city_name as city1, unit, aspect from MANIKA.CITY NATURAL JOIN MANIKA.IS_AFFECTED_BY NATURAL JOIN MANIKA.WEATHER where aspect = :aspect1 and city_name= :cityName1) c1) FULL OUTER JOIN ((select w_date, metric_value as f2, city_name as city2, unit, aspect from MANIKA.CITY NATURAL JOIN MANIKA.IS_AFFECTED_BY NATURAL JOIN MANIKA.WEATHER where aspect = :aspect2 and city_name= :cityName2) c2) ON c1.w_date=c2.w_date)`;

const query2 = `select aspect, w_date, m1, city_name1, m2, city_name2, unit from (select v1.aspect as aspect, v1.w_date as w_date, v1.m as m1, v1.city_name as city_name1, v2.m as m2, v2.city_name as city_name2, v1.unit as unit  from (select LAST_DAY(TO_DATE(x || y || '-01', 'YYYY-MM-DD')) as w_date, m, city_name, aspect, unit from (select to_char(w_date, 'yyyy') as x, to_char(w_date, 'mm') as y, avg(metric_value) as m, city_name, aspect, unit from MANIKA.CITY NATURAL JOIN MANIKA.IS_AFFECTED_BY NATURAL JOIN MANIKA.WEATHER where aspect = :aspect1 and city_name=:city1 group by to_char(w_date, 'yyyy'), to_char(w_date, 'mm'), city_name, aspect, unit order by to_char(w_date, 'yyyy'))) v1 FULL OUTER JOIN (select LAST_DAY(TO_DATE(x || y || '-01', 'YYYY-MM-DD')) as w_date, m, city_name, aspect, unit from (select to_char(w_date, 'yyyy') as x, to_char(w_date, 'mm') as y, avg(metric_value) as m, city_name, aspect, unit from MANIKA.CITY NATURAL JOIN MANIKA.IS_AFFECTED_BY NATURAL JOIN MANIKA.WEATHER where aspect = :aspect2 and city_name= :city2 group by to_char(w_date, 'yyyy'), to_char(w_date, 'mm'), city_name, aspect, unit order by to_char(w_date, 'yyyy'))) v2 ON v1.w_date = v2.w_date)`

//const query3 = `select * from (select t2.city_name, t1.w_date, t1.a1, t1.u1, t1.m1, t2.a2, t2.u2, t2.m2 from (((select w_date, aspect as a1, unit as u1, metric_value as m1, city_name from MANIKA.CITY NATURAL JOIN MANIKA.IS_AFFECTED_BY NATURAL JOIN MANIKA.WEATHER where aspect = :aspect1 and city_name=:c1) t1) FULL OUTER JOIN ((select w_date, aspect as a2, unit as u2, metric_value as m2, city_name from MANIKA.CITY NATURAL JOIN MANIKA.IS_AFFECTED_BY NATURAL JOIN MANIKA.WEATHER where aspect = :aspect2 and city_name=:c2) t2) ON t1.w_date = t2.w_date))`

const query3 = `select city_name, w_date, aspect1, unit1, m1, aspect2, unit2, m2 from (select v1.city_name as city_name, v1.w_date as w_date, v1.aspect as aspect1, v1.unit as unit1, v1.m as m1, v2.aspect as aspect2, v2.unit as unit2, v2.m as m2 from (select LAST_DAY(TO_DATE(x || y || '-01', 'YYYY-MM-DD')) as w_date, m, city_name, aspect, unit from (select to_char(w_date, 'yyyy') as x, to_char(w_date, 'mm') as y, avg(metric_value) as m, city_name, aspect, unit from MANIKA.CITY NATURAL JOIN MANIKA.IS_AFFECTED_BY NATURAL JOIN MANIKA.WEATHER where aspect = :aspect1 and city_name=:city1 group by to_char(w_date, 'yyyy'), to_char(w_date, 'mm'), city_name, aspect, unit order by to_char(w_date, 'yyyy'))) v1 FULL OUTER JOIN (select LAST_DAY(TO_DATE(x || y || '-01', 'YYYY-MM-DD')) as w_date, m, city_name, aspect, unit from (select to_char(w_date, 'yyyy') as x, to_char(w_date, 'mm') as y, avg(metric_value) as m, city_name, aspect, unit from MANIKA.CITY NATURAL JOIN MANIKA.IS_AFFECTED_BY NATURAL JOIN MANIKA.WEATHER where aspect = :aspect2 and city_name= :city2 group by to_char(w_date, 'yyyy'), to_char(w_date, 'mm'), city_name, aspect, unit order by to_char(w_date, 'yyyy'))) v2 ON v1.w_date = v2.w_date)`;


const firstUpperCase = str => str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});;

const appendWhereArguments = (argumentKey, argumentValues) =>
  `${argumentKey} = :${argumentValues}`;

const addOrderByClause = (query, key, isAscending) =>
  `${query} order by ${key} ${isAscending ? "ASC" : "DESC"}`;



const handleDatesClause = (query, queryArguments, dates, appendAnd=true) => {

  if (dates.length !== 0) {
    if (dates.length === 1) {
      let d = new Date(dates[0]);
      if (new Date().getFullYear() === d.getFullYear()) {
        if (appendAnd) {
          query += ` and to_char(W_DATE, 'mm') = :f1`;
        } else {
          query += ` to_char(W_DATE, 'mm') = :f1`;
        }
        queryArguments.push(d.getMonth() + 1);
      } else {
        // handling for year only. 
        if (appendAnd) {
          query += ` and to_char(W_DATE, 'yyyy') = :f1`;
        } else {
          query += ` to_char(W_DATE, 'yyyy') = :f1`;
        }
        queryArguments.push(d.getFullYear());
      }
    } else if (dates.length === 2) {
      let d1 = new Date(dates[0]),
          d2 = new Date(dates[1]);

      if (new Date().getFullYear() <= d1.getFullYear()) {
        if (appendAnd) {
          query += ` and to_char(W_DATE, 'mm') >= :d1 and to_char(W_DATE, 'mm') <= :d2`;
        } else {
          query += ` to_char(W_DATE, 'mm') >= :d1 and to_char(W_DATE, 'mm') <= :d2`;
        }
        queryArguments.push(d1.getMonth(), d2.getMonth());
      } else {
        if (appendAnd) {
          query += ` and to_char(W_DATE, 'yyyy') >= :d1 and to_char(W_DATE, 'yyyy') < :d2`;
        } else {
          query += ` to_char(W_DATE, 'yyyy') >= :d1 and to_char(W_DATE, 'yyyy') < :d2`;
        }
        queryArguments.push(d1.getFullYear(), d2.getFullYear());
      }
    }
  }

  return {
    query,
    queryArguments
  }
}
const generateQuery = (
  cityNames,
  regionNames,
  weatherAspects,
  dates,
  tables
) => {
  let query = query1.slice();
  let queryArguments = []
  query = `${query} where ${appendWhereArguments(
    "city_name",
    "x"
  )} and ${appendWhereArguments("aspect", "y")}`;

  queryArguments = [cityNames[0], firstUpperCase(weatherAspects[0])];

  afterAddingDateClauses = handleDatesClause(query, queryArguments, dates);
  query = afterAddingDateClauses.query
  queryArguments = afterAddingDateClauses.queryArguments

  query = addOrderByClause(query, "w_date", true);

  return {
    query: query,
    queryArguments: queryArguments,
    graphtype: 1
  };
};

generateTwoCityJoinWithSameAttributes = (
  cityNames,
  regionNames,
  weatherAspects,
  dates,
  tables
) => {

  let query = query2.slice(), 
      queryArguments = [];

  queryArguments.push(firstUpperCase(weatherAspects[0]), cityNames[0], firstUpperCase(weatherAspects[0]), cityNames[1])

  if (dates.length != 0) {
    query += " where "
    afterAddingDateClauses = handleDatesClause(query, queryArguments, dates, false);
    query = afterAddingDateClauses.query
    queryArguments = afterAddingDateClauses.queryArguments
  }


  query = addOrderByClause(query, "w_date", true);

  return {
    query: query,
    queryArguments: queryArguments,
    graphtype: 2
  }
  
}

generateSameCityTwoAttributes = (
  cityNames,
  regionNames,
  weatherAspects,
  dates,
  tables
) => {

  let query = query3.slice(), 
      queryArguments = [];

      queryArguments.push(firstUpperCase(weatherAspects[0]), cityNames[0], firstUpperCase(weatherAspects[1]), cityNames[0])

      if (dates.length != 0) {
        query += " where "
        afterAddingDateClauses = handleDatesClause(query, queryArguments, dates, false);
        query = afterAddingDateClauses.query
        queryArguments = afterAddingDateClauses.queryArguments
      }
    
    
      query = addOrderByClause(query, "w_date", true);

  return {
    query: query,
    queryArguments: queryArguments,
    graphtype: 3
  }
  
}
module.exports = {
  generateQuery: generateQuery,
  generateTwoCityJoinWithSameAttributes: generateTwoCityJoinWithSameAttributes,
  generateSameCityTwoAttributes: generateSameCityTwoAttributes
};

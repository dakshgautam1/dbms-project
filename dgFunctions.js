query1 = `select * from MANIKA.CITY NATURAL JOIN MANIKA.IS_AFFECTED_BY NATURAL JOIN MANIKA.WEATHER`;

query2 = `select * from (select c1.w_date as w_date, c1.f1 as city1_values, c1.city1, c2.f2  as city2_values, c2.city2 from ((select w_date, metric_value as f1, city_name as city1 from MANIKA.CITY NATURAL JOIN MANIKA.IS_AFFECTED_BY NATURAL JOIN MANIKA.WEATHER where aspect = :aspect1 and city_name= :cityName1) c1) FULL OUTER JOIN ((select w_date, metric_value as f2, city_name as city2 from MANIKA.CITY NATURAL JOIN MANIKA.IS_AFFECTED_BY NATURAL JOIN MANIKA.WEATHER where aspect = :aspect2 and city_name= :cityName2) c2) ON c1.w_date=c2.w_date)`;


query3 = `select * from (select t1.w_date, t1.a1, t1.u1, t1.m1, t2.a2, t2.u2, t2.m2 from 
  (((select w_date, aspect as a1, unit as u1, metric_value as m1 from MANIKA.CITY NATURAL JOIN MANIKA.IS_AFFECTED_BY NATURAL JOIN MANIKA.WEATHER
  where aspect = 'Temperature' and city_name='New York') t1) 
  FULL OUTER JOIN
  ((select w_date, aspect as a2, unit as u2, metric_value as m2 from MANIKA.CITY NATURAL JOIN MANIKA.IS_AFFECTED_BY NATURAL JOIN MANIKA.WEATHER
  where aspect = 'Humidity' and city_name='New York') t2) ON t1.w_date = t2.w_date))
  ;`


const firstUpperCase = input => input[0].toUpperCase() + input.substr(1);

const appendWhereArguments = (argumentKey, argumentValues) =>
  `${argumentKey} = :${argumentValues}`;

const addOrderByClause = (query, key, isAscending) =>
  `${query} order by ${key} ${isAscending ? "ASC" : "DESC"}`;



const handleDatesClause = (query, queryArguments, dates) => {

  if (dates.length !== 0) {
    if (dates.length === 1) {
      let d = new Date(dates[0]);
      if (new Date().getFullYear() === d.getFullYear()) {
        query += ` and to_char(W_DATE, 'mm') = :f1`;
        queryArguments.push(d.getMonth());
      } else {
        // handling for year only. 
        query += ` and to_char(W_DATE, 'yyyy') = :f1`;
        queryArguments.push(d.getFullYear());
      }
    } else if (dates.length === 2) {
      let d1 = new Date(dates[0]),
          d2 = new Date(dates[1]);

          if (new Date().getFullYear() <= d1.getFullYear()) {
        query += ` and to_char(W_DATE, 'mm') >= :d1 and to_char(W_DATE, 'mm') <= :d2`;
        queryArguments.push(d1.getMonth(), d2.getMonth());
      } else {
        query += ` and to_char(W_DATE, 'yyyy') >= :d1 and to_char(W_DATE, 'yyyy') < :d2`;
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

  // afterAddingDateClauses = handleDatesClause(query, queryArguments, dates);
  // query = afterAddingDateClauses.query
  // queryArguments = afterAddingDateClauses.queryArguments

  // query = addOrderByClause(query, "w_date", true);

  return {
    query: query,
    queryArguments: queryArguments,
    graphtype: 2
  }
  
}

module.exports = {
  generateQuery: generateQuery,
  generateTwoCityJoinWithSameAttributes: generateTwoCityJoinWithSameAttributes
};

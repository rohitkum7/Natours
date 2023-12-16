class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }
  filter() {
    // BUILD QUERY
    // 1A) Filtering
    let queryObj = { ...this.queryString };
    let excludeFeilds = ['page', 'sort', 'limit', 'fields'];
    excludeFeilds.forEach((element) => delete queryObj[element]);

    // 1B) Advance Filtering

    // {duration: {gte: '5'}, difficulty: 'easy'}  It is send by the Api
    // {duration: {$gte: '5'}, difficulty: 'easy'}  It is understand by the DB, you can see the diffrence in y=the operator (i.e. $)
    // lte => less than equal to, gte =>  greater than equal to, lt, gt these need to be changed when we will send the data to MongoDb

    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|lte|lt|gt)\b/g, (match) => `$${match}`);
    this.query = this.query.find(JSON.parse(queryStr));
    return this;
  }
  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }
    return this; // Entire Object
  }
  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }

  paginate() {
    let page = this.queryString.page * 1 || 1;
    let limit = this.queryString.limit * 1 || 100;
    let skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);
    return this;
  }
}

module.exports = APIFeatures;

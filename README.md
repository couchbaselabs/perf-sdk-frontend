# Couchbase SDK Performance UI


## Running locally
Create `nest/.env`:

```
CB_DATABASE=localhost
CB_DATABASE_PASSWORD=<your database password>
```

Terminal 1:
```
cd nest
npm install
npm run start:dev
```

Terminal 2:
```
cd vue
npm install
npm run serve
```

Visit http://localhost:8080

## Running on production
See https://github.com/couchbaselabs/couchbase-sdk-server

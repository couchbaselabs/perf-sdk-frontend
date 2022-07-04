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
Production is setup to automatically regularly pull and use any pushed changes to the repositories, as can be seen with:

```
ssh -i ~/keys/sdk-performance.pem ec2-user@ec2-54-193-85-254.us-west-1.compute.amazonaws.com
crontab -l
crontab -e
less /var/spool/mail/ec2-user
```

The backend and frontend are also setup to run automatically with systemd as can be seen with:
```
$ sudo cat /etc/systemd/system/perf_vue.service

[Unit]
Description=SDK Performance Vue
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/perf-sdk-frontend/vue
ExecStart=/usr/bin/npm run serve
Restart=on-abort

[Install]
WantedBy=multi-user.target
```

```
$ sudo cat /etc/systemd/system/perf_nest.service
[Unit]
Description=SDK Performance Nest
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/perf-sdk-frontend/nest
ExecStart=/usr/bin/npm run start:dev
Restart=on-abort

[Install]
WantedBy=multi-user.target
```

```
sudo systemctl daemon-reload
sudo systemctl start perf_vue
sudo systemctl start perf_nest
```
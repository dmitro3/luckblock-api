FROM node:20.0

RUN apt-get update
RUN apt-get -y install python3 python3-dev
RUN apt-get -y install python3-pip

RUN pip3 install solc-select
RUN pip3 install slither

RUN solc-select install all

COPY . /app

WORKDIR /app

EXPOSE 3000

RUN yarn install

RUN node .

FROM node:20.0

RUN apt-get update
RUN apt-get -y install python3 python3-dev
RUN apt-get -y install python3-pip

RUN apt-get -y install graphviz

RUN pip3 install solc-select
RUN pip3 install slither-analyzer

RUN solc-select install all

RUN mkdir /app

COPY package.json /app

RUN yarn install

COPY . /app

WORKDIR /app

EXPOSE 3000

CMD ["yarn", "start"]

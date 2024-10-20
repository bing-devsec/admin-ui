import axios from 'axios';


const config =  {
    baseURL: 'http://127.0.0.1:8080',
    headers:{
        'Content-Type':'application/json;charset=utf-8',
    },
    withCredentials: false,
}

const _axios = axios.create(config)

_axios.interceptors.response.use(
    response => {
        return response;
    },
    error => {
        return Promise.reject(error);
    }
)

_axios.interceptors.request.use(
    config => {
      return config;
    },
    error => {
      return Promise.reject(error);
    }
  );

export default _axios;
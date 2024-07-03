import fetch from "node-fetch";

export const APIPost = async (route, body) => {
  try {
    const data = await fetch(route, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const parsedData = await data.json();
    return parsedData;
  } catch (error) {
    console.log(error);
    return error;
  }
};

export const APIGet = async (route) => {
  try {
    const data = await fetch(route, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const parsedData = await data.json();
    return parsedData;
  } catch (error) {
    console.log(error);
    return error;
  }
};

export const APIDelete = async (route) => {
  try {
    const data = await fetch(route, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });
    return data.status;
  } catch (error) {
    console.log(error);
    return error;
  }
};

export default null;

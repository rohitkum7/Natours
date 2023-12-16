import axios from 'axios';
import { showAlert } from './alert';

export const bookTour = async (tourId) => {
  try {
    //1) Get check-out session from the api server
    const session = await axios(
      `http://127.0.0.1:3000/api/v1/bookings/checkout-session/${tourId}`,
    );
    return session;
  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
};

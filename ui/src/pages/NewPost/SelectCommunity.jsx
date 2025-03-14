import PropTypes from 'prop-types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { kRound, mfetchjson, selectImageCopyURL } from '../../helper';
import { useDelayedEffect, useQuery } from '../../hooks';
import { snackAlertError } from '../../slices/mainSlice';

const SelectCommunity = ({ initial = '', onFocus, onChange, disabled = false }) => {
  const dispatch = useDispatch();

  const [suggestions, setSuggestions] = useState([]);
  useEffect(() => {
    (async function () {
      try {
        const communities = await mfetchjson('/api/communities?sort=size&limit=10');
        setSuggestions(communities);
      } catch (error) {
        dispatch(snackAlertError(error));
      }
    })();
  }, []);
  const [value, setValue] = useState(initial);
  const [focus, setFocus] = useState(false);
  const query = useQuery();
  useEffect(() => {
    const name = query.get('community');
    if (name === null || name === '') return;
    (async () => {
      try {
        const comm = await mfetchjson(`/api/communities/${name}?byName=true`);
        setValue(comm.name);
        onChange(comm);
      } catch (error) {
        dispatch(snackAlertError(error));
      }
    })();
  }, []);

  const handleChange = (e) => setValue(e.target.value);
  useDelayedEffect(
    useCallback(() => {
      (async function () {
        try {
          const communities = await mfetchjson(`/api/communities?q=${value}&sort=size&limit=10`);
          setSuggestions(communities);
        } catch (error) {
          console.error(error);
        }
      })();
    }, [value]),
    200
  );

  const [index, _setIndex] = useState(-1);
  const setIndex = (down = true) => {
    _setIndex((i) => {
      if (i === -1) return 0;
      let ni = i + (down ? 1 : -1);
      if (down && ni >= suggestions.length) {
        ni = 0;
      } else if (ni <= -1) {
        ni = suggestions.length - 1;
      }
      return ni;
    });
  };
  useEffect(() => {
    _setIndex(-1);
  }, [focus]);

  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      setIndex(!e.shiftKey);
    } else if (e.key === 'ArrowDown') {
      setIndex(!e.shiftKey);
    } else if (e.key === 'ArrowUp') {
      setIndex(e.shiftKey);
    } else if (e.key === 'Enter') {
      let selected = index;
      if (suggestions.length === 1) selected = 0;
      if (selected !== -1) {
        _setIndex(-1);
        setValue(suggestions[selected].name);
        setFocus(false);
        document.querySelector('textarea').focus();
        onChange(suggestions[selected]);
      }
    } else if (e.key === 'Escape') {
      setFocus(false);
    }
  };

  const inputRef = useRef();
  const handleFocus = () => {
    setFocus(true);
    if (onFocus) onFocus();
    inputRef.current.select();
  };

  const ref = useRef(null);
  useEffect(() => {
    const onBodyClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setFocus(false);
      }
    };
    document.addEventListener('click', onBodyClick);
    return () => {
      document.removeEventListener('click', onBodyClick);
    };
  }, []);
  const handleSuggestClick = (suggestion) => {
    setValue(suggestion.name);
    setFocus(false);
    onChange(suggestion);
  };

  const isActive = focus && suggestions.length !== 0;

  return (
    <div className={'page-new-select' + (isActive ? ' is-active' : '')} ref={ref}>
      <div className="page-new-select-input">
        <input
          ref={inputRef}
          className={'card' + (isActive ? ' is-active' : '')}
          type="text"
          placeholder="Select a community"
          onFocus={handleFocus}
          onChange={handleChange}
          value={value}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          focus={focus.toString()}
        />
        <svg version="1.1" x="0px" y="0px" viewBox="0 0 512.005 512.005" fill="currentColor">
          <path
            d="M508.885,493.784L353.109,338.008c32.341-35.925,52.224-83.285,52.224-135.339c0-111.744-90.923-202.667-202.667-202.667
			S0,90.925,0,202.669s90.923,202.667,202.667,202.667c52.053,0,99.413-19.883,135.339-52.245l155.776,155.776
			c2.091,2.091,4.821,3.136,7.552,3.136c2.731,0,5.461-1.045,7.552-3.115C513.045,504.707,513.045,497.965,508.885,493.784z
			 M202.667,384.003c-99.989,0-181.333-81.344-181.333-181.333S102.677,21.336,202.667,21.336S384,102.68,384,202.669
			S302.656,384.003,202.667,384.003z"
          />
        </svg>
      </div>
      {isActive && !disabled && (
        <div className="page-new-select-suggest">
          {suggestions.map((s, i) => (
            <div
              role="button"
              tabIndex={0}
              className={'page-new-select-suggest-item' + (i === index ? ' is-hovering' : '')}
              key={i}
              onClick={() => handleSuggestClick(s)}
            >
              <img
                src={
                  s.proPic
                    ? selectImageCopyURL('tiny', s.proPic)
                    : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOEAAADhCAMAAAAJbSJIAAABXFBMVEX/zg7////19vYjHyD/zQD/ywD/0w0AACH/0Q3RHybVHybZHib/1A3PHyYAAAD/zgDKHyb0+P7EICYACCHCICYeGyD/1DEVFSAbGSAJAAAfGhsUFCALDiHfHiZ8FRb//fQXERN0Xh30xRC/mhcIDCH/+un/3Wr/2lz/9dX/8cXvwRH37dj/7bP//fL/4YH/99z/6aGoiBm7lxeegBrIohbasBT/77z+0Tz64qf28us3NDXt7u5GOh/kuBP/5ZP/44j/5phmUx6HbhtVRh+Ocxv+00xgX1+np6fZ2toTHyB8ZBwzKyA7MR8rJCD468792HGXl5e6urqEhIR1dHWMjIzrdR7gQySUFxurGh+xsbHHyMhNTEwxLzBTUlNEQkP6uhTynhrthR32rRflXCLtjBzhSyTndx/fZiGQHiN/HyJpHyFSHyE8HyDVUiSbGBw9HyAEHyDLQyVbNyBbSx5CrmBPAAAWXElEQVR4nNWd+1vbRtbHJXt0IVHsEAffC8bxhYsxBuwYAoYYcEIJhFBoc2maJt23Sbvd9t3d/P/PszOSLY2kkTQzkjD99ocmjhnmozlzzpmLZgQxdi3Ul1utTrvRHGUnGjUb7U6rtVxfiP/XCzGWDdH2L0ZZIEnAkDDR+O/wH7Kji/3l+lqMtYiLsL7cbkI2GxdJOijkbD9ej6kmcRDWW40sqnnalw1XWn8SjVY9htpETbiwfJCVghrOE1PKHixH3TUjJVx73FAlLrqJIKTaeBxpt4yQcLkhSGHoLEqh8Ti6akVFuH6QDtV4TkjQjsrzREK40BpF0no2SKnfiqRLRkBY34/GOt2MwkEEzjU04foFS1hghQSN0MYaknC9GUvzYYxSc2mKhOuNmPmiYAxBWG9E6D19GUPZKjfhwsEN8emMUpvbr/ISttSb49MZ050bJVzqS7H5Ty9Jfb7uyEV4kwZqCeY5N0S4dMMGijGml2+AcKF9AxHCS2npgtnjsBIuZafHhwSyrL2RkfDpVHqgDRHsx0i4NpKmzIck9ZnycRbCJWHaDWiIzeEwEHambqETAfA0DsLGbbDQiaRm5IQL/dvSgIZAlrYzUhKuTzlIuAUEyrBBR3hbfAwuWn9DRdiaYhrjI6kVFWHrNvkYXBLNiIqCsHUrG1AXTdQIJuzc1hZEkg7CE95qQBrEIEKePqjKmrASPQxZUpChBhAy90FE191YPJtbjIWHIBDgbvwJGVtQldXBxrCcqZXLyl5MQG4FBA1fwiUmQIi3daTUSiXlfO90Y0WNi8glyTf0+xGupxlsVKtufq2VS7DxDrsrgibfHKAgpP0SOB/CBfpcVNWqx8kawttYEbjhVCSeHwSCTxruQ0g9mlDlwalSzmVebK1wt50qC9UBUhU+LuZCQJaHsEELqA0OM6WcMuwKGm/ryUL38KikIGXOvp5u9qqMlMB7vOhJSBvpZWFrrpxTFnuwFXglPzpTSqVyBgJCN1wqZTJni5vQHhiK8A6LXoTLdC2oat1zyDcchPEs6qGSq5WHx5vdbndzCzZmOQMpS0cbVYZSgZdD9SCs0w0I5ZVFJZ856nGbp6Ez5cUmdL8ydDSyrGnCAKYMmXKuppz2qBnTaQ9v40E4ogKEDVgqJTcFfvvUpXa3qrYiUGLUOz5TciVlSP30QJ+F8ClNJ1TV40xeGa6E5BN0R0r6rLeIeudpVaMrBZCTcCLhEk0LyitHtdzcZkgD9ZOqrRzmSqXSBmWUJHdFEiFVqJd757na0YDy+XJK1QaLtbxy1JNpDAUIpO1iJMI2BaDWTeaVUyH23EyVu3uZXBkF22BI0KAjpMm3tUflvLIRvgdSCAZcpVyqJY+Og78rEfbDEQgpFkDlTWUu043XQi1pK8cvICTNE027lxfdhBQ2qg6UudyNAQpo4NI9Hh4NgvsEuAgmpPGjaldRbhIQ/Uros2k6vdufugipRhRqb3AjfZBd7lGGk5By3oJvHHcTcs0SOwgXQm2TSbPtX4+niPSaL+EB7/w22oYujBqNRrPPuZFd3xksZZuwjJEg8WM6d93YCdc5AQHo77/cmTWUWN1uCswVTAOhub2aGJex8/JpnxdSWvchbHIRAuFgFYJZgjXc7jPVLw362zuOMlb3+db0HON9GyFVxu0qEDzdwas2rmBimWHVGGSXE4Qydra57B0seRJST83gxTUIfAYjbf3gMyLwGYwXHKZqb0SccJ19jQKAbXLd9PqtUg2kQX/Vp4zHHKYqLXkQsvdCkPWpHBJFCggufEuYXWXfIwFGZEL2JgR9Dwu16hc4WwAO/EtIJHboplRw4Y2IETL3QjAKqhxE3A54O+9pwDNCYjYuvCdahHXmYvo7wZWDrehXLjigAEwkmFsRrBMI9xlLSQs0gBDxwrtgcEEFmNjpM3pULLExCRcExkKkl3S1SyQ8XQXIUpaQWGX2EWsuQtblbNChBUysepaxSltEUHcmVM9FyGjqNF4mqHpUXmZSBqMftOaHJ4SsoQK8pCdMzBLtNE1to0irjI1oBowJIc0MIg7Ypn/8CY9uRN+R9afE6AnNGZsJIauZ0/lRs3oEGwMjpoeU2GGt4oKN8HGsTZhIvCQQsth5gqMRWzZCxn4ssTUhrJ4rLWFxVYYYG3GS1xiEa0w/C3+YsQkTCdeKq9+ghCy/1IGk8YKiwGWky6yAiUTWnlDQZkS4CKbuW8sWRshmpOkse+2cvYg2X7OJLXcbm6lOyDiHyFU7RwPwmMEs40ygMa+oEy6zhXuwzEE46yBkL4HZTI0Nbzoh6ywpu5E6/QSHr4LaYRsdGEFfJ2R71YAt2zIJOzbCfR7CWcbkWZ0Q1hmN1Lsbirb/2WUzMe9uqHsHL0LGoK/npoiQcZus97jp5NWzYipVefbqhPCPO/hz9EgZxN3L766url692yVCzrJGtc6YkHVg8phcu5NnhUIxCVUsFJ6duKuIR0SioxFProqpClQh9f6ayMgaEUdjQsbRPXncKr6qVJKmKpVXrm9giVu6TyriumCWUCwk3xIQWbNvwSBkXY4hjyuepZI2pZ45voA7U9BwP6GTZAH/+aKrACTWqi7phIzGTbawq0LSoYKjhjZCt7M6eV8MKCDhCqrBVW3phIyDXxKheJ1yAsIafmezMzwjcRPuPqm4C7hyGiozYUMnZJ2MBK7nL74jAMIaXuI1xCdOXYTilRsQWvpzB+JsltFl9BHhGuNPEQgTRaeFGV0puetF6BhBi2+Jj6hYcYQdVkJBqENC9rluJ6H43NUJx434CmsDXyslP6JkxWGns4xVRXPfAmvaTeqHTyb1g5GsULEqWyzitWt7EmKPqFip4LApeyOy9kPkagTm2XwXofh2XL9K5ertyeV10upSeEeyRwt7G34oTkp4cnX1BAusFbu3Yo0WaM+pIDLODbgj/sRLVH48QRmluGtFjsozrIJ4xLdP0kwcFUqFoGByZBm67YvMER86U4HZlbqy5l3DSIvvTb/yk2louJn2vbI28VVh/DwczwwR2syUdVoYbZESRObdTc45pJOUwyuYZgsr+I5sYfbM+1nFQXNiula7s2JNTtBmRWGBfQ3Z4eovXYSXFqHVEW3P3zZZumukM8UnVnCxfBdu5/5rkURJawLj4FBAaTPRERY/TCqIG5nZBPblGduizO6kGxLasPgBJ2TfaSAtCczBQnDMYojXY57ClT70FfHwWLk2CW3JoS1cTHjM9sIeUfED/ruYAz4c6gkcb2rb5+Ot6lSevD1JnFz+hMV/y3Qd6QieNpg5H8GX4qbL7mjQIFjocPyUbfHdbEM0qktBGZ3K2YaO2uFPycpqK6kfr65+TGE5Kk44y1PXjsDeeR3jV2LOVkkaYdvsh87a4VNRJ1hSauY0lfF8AW6l7NtOYGsIrGMn/cdsZnrpzpoL3yVO9KBo+lLnNBn+lHYJ44rCq7e6P8U9DYeRwpAv8GxHtKeV7qFT8QkaUaGmNeOha4YFyxt2n7jybvhk4KA/acu9WWfajF/TFDha3jGR4a5gESUnu3oTjHvRrMtUsNRUfOZqRJRxi8gKsICaYN0tov+avsB1so4trXFXECVwetgv/jSuHyGhtNJbQk/WCVE+bsVI5u0YhrLwPw6lBawNxecuM608O3mHWnbiaEhrKpipu+0chkbxEj24ivV72INhCEL7rPCuaxIJun09aBTGRrpD3KlgjVF+chfwRA+KhWtyThS/bAuc4rXXGH88uiOv3lqrMyLBHRuj/oIZDXf4mpBfNne6S5xlgQ1hdKJZj6lq8Ngsw20FxiOyUiLutwi4hS8iekwkTUb4Xo/fMgSPyTpryOn1kGIVHjFE94SwlUh77zCwpr7F70iGnjKnIxlXDqORbbvI7o+ukFYZj6b8XIQ1iCIUkExZboZnj/1EfL5Ur56tK35wNEJhAuhrX1ZX3P3gREx9Rx55sYqf0DHYvypg3qKYuqIBtHXnn/ACYAlWC/Kka5bCnBYI2hih+O5DyhgXFCupJ+MeBAEDOpDViuLzpMlYTH14F40bzfLlpWb18DcJxMTl1Xs0QHx/dTle35x9HPxCiJUBirvX71MFtECa+vG5tVTOPN1pU5ZrbIFVz/42iJjYPTmBOemkdlRPH3tMYuLk+fX1q8sTk2+2HqoJoD/kGh/iJUjbHm/00L8LArLYTlPHTgW+N5+wshs8Y3xHGaOXswTG2Z02deXS4IL4asrsy3ANKOhjfI65D2chYLTsYJydXW0zva8EhPaqq4yXzfCn3oIOz1ybuxhQPXiZmLwdOZtY7YyY6wafU2fVLCOReHmQjeJUX0jIM1/qFnp9d3Sxv7293WmjK4N46pYGktBsP4Vl7F+MQr9QPBZoCRyv5HkVBpzXq02nDJukJY51i7+VpDWOtae/ldILAv2xbH9H6euHYQYmt16gybOOH69UVdY0OapTKUAbEj6+RYfMqrL088dP33//6ePP/Mcv4tL3YvCeoxC9VPmX73/4ZqwfPv8cAaO+n4bxbZL4pP3y6zc2/YP2HDMf1Xn2tcUjVf3yjUv/F/IUHGNfG/uGmjikVn91A8JmDHea2Hhv4u04kfwHEuA3d3+QiIgq1QFu+kZvjj3CcUj+ctdDv5JaUettPaI6o25pvM976pI/egEiRPfXj5WyckjjhsY72cNN1UQib8C7dz87UdRDJZksDYMJzb364Yf5IaV98iO8+4vdINXTWjKZz1Mcp61fLCBwvMcdvXwB797Bv6qqQwiYe0FznJr5zsy0B1B+vVDXJ4tGFXTAM6pTU9Pmm10hZxTDSv6Hg+jh6zf2RqxOvqpWh2XYB/eoTnw3jsLUCaecfFfv2HV3fv71XdsHH8ctpgpHOmCVyuqA9f7h2hQW5yypH52Er+df2z/51SBSq2clCHhEmegA6x3S6cYL+bOT8K/53xwf/YyY5JW9XDJZHtICjrA3naeauMl/OnDuvJmfv2f/BKXg8uAMAmZoASfHmxiE9WmaqTrjJHw4P//A/skXDQIm8xCQ/maQ9Dp+psI0zbTqIrw/P//Q9sHMr5rcy8xBwEPqyDY58GtMOEUzVX+ZcerO/PybO/aPtG4OAirH9APGyRk8Y8IpzgvLH0mEr+2Ed7s1BLjFMOiX6jbCKQ6D5U/3XISvoTO1ffAbjBJztQ0GQPNAswkh5ZUycOQJFWmWJ392Ec78BZ0p/vff/w0BS49Ypm3My2fMc6Iopr5VbaW7ubWx8ahHc3w4rbQv95yageHiwYz5t5l/fosAmc5mts4TNgmDh1Bad5hUMuVyLVN6Mdzkv5DEWSyBEIaLhxPCmXt/QMB8rsf0UK0bZ03CoMxNrS4quclml7l8RjmM4FIEJALhvQfQmc5MaP/1Le1oCZN124V15l7AAKOKct65mmJu6SnltsKAmdL+dBPCgPjXxGDPIWCJbrRkCTu53CL0n5DS0Kgld7Y50Olqemsqm1G0ovbnfafu3f8NEqI/3XmDflHmK91gwhJ2DC129qVfXqM+go2X26tq6h6MS7VHp0ouX5ujOAY+WNoXF+H9+3B0gQhnfvsWPUnmOxjwA0wxQr+AocFOWMtDInUIk0Olp/UW97ZYH6xH0d6E935HTjTDEucN4feU4WfQ+kzvq4PF4Rbq7PIiyu83ZVWLKmB4Et67/4ceBjeZAW1XzuCEfo2ojgO9vIXGoAzpYaC0z2TCmYf/j6JEki1K6LJdNWc7C5pihCFvZuCvHcZP+NdfusPe44hJtmOEmc/zVnvQ5cydR5i3yWRClMcka9TDXVz2GyCYz2SvnqEkP8LbDeVPD1yAD+b/0J3oIRegrQkdhBT5t3wEnWktkkg4LvDjA6fu61FwjvMiG8eFj467EYI3ZmjH0NXkFqO7oUT9xcl3X4+CufMe1y9xXqPnIFwLJFS7NfR8eX63R4E/P7QDPvznv1EX/MqZ94K6LyHFpYDVJMpqutF1RMlGeP/Nv/i7oIAPKjwIg89u01DML51GZ6ayjRClMck8R5g3BLLO+5BchIEXH+oRce48uiuN5f88nOjBmz90C+W/7Qy47rRy3/cUOGNTRSOoTHTeVP4y4bv/WxIlotwWKpDuJXMTBh6EqZtpProbjeXPY8CHepQv5bv8Dw+475Yj3EoWtBKlpzVJJUQ97JI/GoDjBlys8hdMut6ZdHdeYFBEQX9uLypCGC7MHphLhrlQ0ZHNeBOuBWyz131NRCN8pCok/D2px4hQN2KmiRcfE++wDPSnaKA/94K/Lg7957UeA0tl2tsqySJfQU6+hzRgVkruokYsH0bSiKo8+C8y0HyN+sZRsgj35nkTBsV9DfVEmNhEgKitHJbnUPg564abgQUeKB4fr/uHDMOdzp2HnqnRhK1kGRlobSvsnbtgnYzidadzwIlM8jHKv3NHoWqlytWNOdSAucxpiBBhiNwJfQgDT08+QlOm5UX+RlS1la0kWvXMZ4Z84yRczvvkKAgDNtaqAzTESNbo12QdP68Njs/RmmBeOeqG37fudaGzL+GCf1SUN/UJ/toiz1qbrHWHufKYL2wHFASPm4CDCINuH9c2dMTyEWsXQt3vTF/lKZW/hr20XBdIe3iZAMKgqTdtA0XFZO4Fi5tXNaG7WEbmOVfOM1yd7ivPm+ODCINycNloxbny6Qodo6pfmZ5BzZdXXmytRLSY7OlGgwmD5jSgoeb1edv8cRCjqspytXt6Xi6h3ldWvnajeWUEATrnLVgIxYC3hLXeWdlYTFQWu1UI4faKKnrNR60Ouod7SsbAKx1trES3TO5xaTwtoXgQYKjVY6MZkzklOdx61FupQls0BccNK73uxuHXM0iHvperKUdbgyj3OngHQkpCsR0wHpZ7Xyer3/lSJpN8cbZ3tDc8hfq6B/XiXMmUS3nkWaBt5hY3B5FZpy6JdJ06G2Egoir3TnM1ZH/GEj9SPgeV1/9oLPuXoHsZbvWEiHeqkO+LZyUMvv1C1aAP0e1wgmntaMiVMkr+7GgLtp0WMZ1AYaJ0hGLgPZQoSan2No+HZwpURhf6U3lvuHi82RtU5RjooKQAJ0NNSDERLiBrhQEDOpbeI1293gB5HTm6tyXdgP5hgoUQjqVot72h4GDsDFNjvp0cAN9Az0goLvFdrxyjQNovVWMnFOtsd9HELt9km4tQXLgdL2KOBfrewyVewhA3y0cviSJKcBAy+Jt4Retj2AnF9VvRGYGwFFxVTkI0VTxtxrTHxG9UhCLPVedRCqRZLJSHUKw3p/kamDQiLb5ES4jezZhWMwLrHuNYCcW1xlQYAWgyNyAnoSguT8GpAsG1CSFGQnFh/4abEYAD5zaSeAmhx2lIN8cIJC4DDUcIxxvsh7Jx8oER5TgiYkLYHUc30I5A6ofgC0kIGfsxMwIpy+dgoiKM2VbD2WdEhJDxIh0LJACgwZRjx0YI/erTbOTGCiRhn9t/4oqEEGq5yXccpAceDA+hzXOsqAhhQ6IjPaOARMdodiJpPl3REUKth4fU8WgnmagUKSHUWquR5rVXaJug0Yqu9QxFTYi09HQkMJ5Bir6e7u9H1fdwxUGItNRp9FFjBnKir0jpfrOzxJlZBykuQqT6eqfdzKYliXCsrPGRJKWzzXZnPWrLxBUn4Vhry63O03ZzlDWP8M9msyMI1mkt12NqOEz/A0tyo6SDV5WgAAAAAElFTkSuQmCC'
                }
                alt=""
              />
              <div className="page-new-select-suggest-name">{s.name}</div>
              <div className="page-new-select-suggest-detail">{kRound(s.noMembers)} members</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

SelectCommunity.propTypes = {
  initial: PropTypes.string,
  onFocus: PropTypes.func,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default SelectCommunity;


import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { WikiArticle, GeoPoint } from '../types.ts';
import { calculateBearing } from '../utils.ts';

interface RadarProps {
  userCoords: GeoPoint;
  articles: WikiArticle[];
  radius: number;
  heading: number;
}

const Radar: React.FC<RadarProps> = ({ userCoords, articles, radius, heading }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = 400;
    const height = 400;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) / 2 - 40;

    const svg = d3.select(svgRef.current)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .style("width", "100%")
      .style("height", "auto");

    svg.selectAll("*").remove();

    const defs = svg.append("defs");
    
    const radarGradient = defs.append("radialGradient")
      .attr("id", "radar-gradient")
      .attr("cx", "50%")
      .attr("cy", "50%")
      .attr("r", "50%");
    radarGradient.append("stop").attr("offset", "0%").attr("stop-color", "rgba(0, 255, 65, 0.2)");
    radarGradient.append("stop").attr("offset", "100%").attr("stop-color", "rgba(0, 0, 0, 1)");

    svg.append("circle")
      .attr("cx", centerX)
      .attr("cy", centerY)
      .attr("r", maxRadius + 5)
      .attr("fill", "none")
      .attr("stroke", "rgba(0, 255, 65, 0.4)")
      .attr("stroke-width", 2);

    const rotatingGroup = svg.append("g")
      .attr("transform", `rotate(${-heading}, ${centerX}, ${centerY})`);

    rotatingGroup.append("circle")
      .attr("cx", centerX)
      .attr("cy", centerY)
      .attr("r", maxRadius)
      .attr("fill", "url(#radar-gradient)")
      .attr("stroke", "rgba(0, 255, 65, 0.2)")
      .attr("stroke-width", 1);

    [0.25, 0.5, 0.75, 1.0].forEach(c => {
      rotatingGroup.append("circle")
        .attr("cx", centerX)
        .attr("cy", centerY)
        .attr("r", maxRadius * c)
        .attr("fill", "none")
        .attr("stroke", "rgba(0, 255, 65, 0.1)")
        .attr("stroke-width", 0.5)
        .attr("stroke-dasharray", "2 4");
    });

    rotatingGroup.append("line").attr("x1", centerX).attr("y1", centerY - maxRadius).attr("x2", centerX).attr("y2", centerY + maxRadius).attr("stroke", "rgba(0, 255, 65, 0.1)");
    rotatingGroup.append("line").attr("x1", centerX - maxRadius).attr("y1", centerY).attr("x2", centerX + maxRadius).attr("y2", centerY).attr("stroke", "rgba(0, 255, 65, 0.1)");

    articles.forEach(article => {
      const bearing = calculateBearing(userCoords, { lat: article.lat, lng: article.lon });
      const distRatio = Math.min(article.dist / radius, 1);
      const r = distRatio * maxRadius;
      
      const x = centerX + r * Math.sin(bearing * Math.PI / 180);
      const y = centerY - r * Math.cos(bearing * Math.PI / 180);

      const dotGroup = rotatingGroup.append("g");

      dotGroup.append("circle")
        .attr("cx", x)
        .attr("cy", y)
        .attr("r", 6)
        .attr("fill", "rgba(0, 255, 65, 0.3)")
        .append("animate")
          .attr("attributeName", "r")
          .attr("values", "4;10;4")
          .attr("dur", `${2 + Math.random() * 2}s`)
          .attr("repeatCount", "indefinite");

      dotGroup.append("circle")
        .attr("cx", x)
        .attr("cy", y)
        .attr("r", 3)
        .attr("fill", "#00ff41")
        .attr("stroke", "#fff")
        .attr("stroke-width", 0.5);

      const labelGroup = dotGroup.append("g")
        .attr("transform", `translate(${x}, ${y})`);
      
      labelGroup.append("text")
        .attr("x", 10)
        .attr("y", -10)
        .attr("transform", `rotate(${heading})`)
        .text(article.title.toUpperCase())
        .attr("fill", "rgba(0, 255, 65, 0.9)")
        .attr("font-size", "9px")
        .attr("font-family", "monospace")
        .attr("font-weight", "bold")
        .style("text-shadow", "0 0 5px rgba(0,255,65,0.8)");
    });

    rotatingGroup.append("text")
      .attr("x", centerX)
      .attr("y", centerY - maxRadius - 10)
      .attr("text-anchor", "middle")
      .text("N")
      .attr("fill", "#00ff41")
      .attr("font-size", "14px")
      .attr("font-family", "monospace")
      .attr("font-weight", "black");

    const userGroup = svg.append("g");
    userGroup.append("circle")
      .attr("cx", centerX)
      .attr("cy", centerY)
      .attr("r", 5)
      .attr("fill", "rgba(255, 255, 255, 0.2)")
      .append("animate")
        .attr("attributeName", "r")
        .attr("values", "5;15;5")
        .attr("dur", "2s")
        .attr("repeatCount", "indefinite");

    userGroup.append("circle")
      .attr("cx", centerX)
      .attr("cy", centerY)
      .attr("r", 4)
      .attr("fill", "#fff")
      .attr("stroke", "#00ff41")
      .attr("stroke-width", 2)
      .style("filter", "drop-shadow(0 0 8px rgba(0,255,65,0.8))");

    const sweep = rotatingGroup.append("line")
      .attr("x1", centerX)
      .attr("y1", centerY)
      .attr("x2", centerX)
      .attr("y2", centerY - maxRadius)
      .attr("stroke", "rgba(0, 255, 65, 0.6)")
      .attr("stroke-width", 2);

    let sweepAngle = 0;
    let animationId: number;
    const animateSweep = () => {
      sweepAngle = (sweepAngle + 1.5) % 360;
      const rad = sweepAngle * Math.PI / 180;
      const x2 = centerX + maxRadius * Math.sin(rad);
      const y2 = centerY - maxRadius * Math.cos(rad);
      sweep.attr("x2", x2).attr("y2", y2);
      animationId = requestAnimationFrame(animateSweep);
    };
    animateSweep();

    return () => cancelAnimationFrame(animationId);
  }, [articles, userCoords, radius, heading]);

  return (
    <div className="relative w-full max-w-md mx-auto aspect-square bg-black/95 border-2 border-green-500/20 rounded-full overflow-hidden shadow-[0_0_100px_rgba(0,255,65,0.1)]">
      <svg ref={svgRef} className="w-full h-full" />
      <div className="absolute top-8 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
        <div className="text-[10px] text-green-500 font-mono tracking-[0.4em] uppercase opacity-40">Heading</div>
        <div className="text-lg text-green-500 font-mono font-bold">{Math.round(heading)}°</div>
      </div>
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[9px] text-green-500/40 font-mono uppercase tracking-widest text-center">
        Dimensional Sensitivity: {radius}m<br/>
        Sectors Scanned: {articles.length}
      </div>
      <div className="absolute inset-0 pointer-events-none opacity-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
    </div>
  );
};

export default Radar;
